"use server";

import { revalidatePath } from "next/cache";

import type { AdminActionResult } from "@/app/actions/admin";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { currentUser } from "@/lib/auth/session";
import {
  COURTS_OPEN,
  courtsLabel,
  dayLabel,
  freeThrough,
  manilaHour,
  moveError,
  parseCourtBooking,
  peso,
  priceOf,
  sportInfo,
  sportName,
  timeRange,
  type CourtFieldErrors,
  type Sport,
} from "@/lib/court-rentals";
import { adminRentalEmail, rentalEmail, type RentalEmailData } from "@/lib/emails/court-rental";
import { sendEmail, siteOrigin } from "@/lib/email";
import { manilaDateKey } from "@/lib/format";
import { deleteProof, proofProblem, saveProof } from "@/lib/payment-proofs";
import { getCourtHolds } from "@/lib/queries";
import { CONTACT } from "@/lib/site";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Gym court rentals (Adrian, 2026-10-20). See src/lib/court-rentals.ts for
 * the rules and supabase/migrations/0020_court_rentals.sql for how two
 * renters are kept off the same court.
 */

export interface CourtBookingResult {
  ok: boolean;
  fieldErrors?: CourtFieldErrors;
  formError?: string;
  needsAuth?: boolean;
  rental?: {
    id: string;
    sport: string;
    date: string;
    start: number;
    hours: number;
    courts: string;
    amount: string;
    email: string;
    emailed: boolean;
  };
}

const GENERIC = "Something went wrong on our end. Try again in a moment.";
const NEEDS_DGROUP = "Register your Dgroup first (account menu → My Dgroups), then book a court.";
const TAKEN = "Someone just booked that time. Pick another time or fewer courts.";
const CLOSED = "The Gym is closed for an event then. Pick another time.";

/** Where the team hears about new rentals. Unset: the church's contact inbox, like the other staff emails. */
const inbox = () => process.env.COURTS_EMAIL || CONTACT.messageEmail;

function refresh() {
  revalidatePath("/reserve/courts");
  revalidatePath("/my/reservations");
  revalidatePath("/admin/courts");
  revalidatePath("/admin/today");
  revalidatePath("/admin/week");
  revalidatePath("/admin/rooms");
}

/** The member's registered Dgroup (waiting or approved) to book for, like Dgroup tables. */
async function registeredDgroup(memberId: string, picked: string): Promise<{ id: string; name: string } | null> {
  const { data } = await supabaseAdmin()
    .from("dgroups")
    .select("id, name")
    .eq("satellite_id", SATELLITE_ID)
    .eq("leader_id", memberId)
    .in("status", ["pending", "approved"]);
  const mine = (data ?? []) as { id: string; name: string }[];
  return mine.find((d) => d.id === picked) ?? mine[0] ?? null;
}

/** True when a block or event closes the Gym for any hour of the rental. */
async function gymClosed(sport: Sport, date: string, start: number, hours: number): Promise<boolean> {
  const holds = await getCourtHolds([date]);
  if (!holds) return false; // The database still refuses taken courts.
  return freeThrough(sport, date, start, hours, holds.filter((h) => h.court === 0)) === 0;
}

const isTaken = (e: { code?: string }) => e.code === "23505";

/**
 * Book a court: check the form, save the payment screenshot, then book. The
 * booking is confirmed at once (Adrian, 2026-10-20) and the team is emailed
 * to check the payment. A screenshot whose booking fails is removed again.
 */
export async function reserveCourt(_prev: CourtBookingResult | null, formData: FormData): Promise<CourtBookingResult> {
  if (!hasSupabase() || !COURTS_OPEN) return { ok: false, formError: "Court rentals aren't open yet." };
  const user = await currentUser();
  if (!user) return { ok: false, needsAuth: true, formError: "Sign in to book a court." };

  const dgroup = await registeredDgroup(user.id, String(formData.get("dgroup_id") ?? ""));
  if (!dgroup) return { ok: false, formError: NEEDS_DGROUP };

  const parsed = parseCourtBooking(formData, manilaDateKey());
  const proof = formData.get("proof");
  const proofError = proofProblem(proof);
  if (!parsed.ok || proofError) {
    return { ok: false, fieldErrors: { ...(parsed.ok ? {} : parsed.fieldErrors), ...(proofError ? { proof: proofError } : {}) } };
  }
  const b = parsed.value;
  if (await gymClosed(b.sport, b.date, b.start, b.hours)) return { ok: false, fieldErrors: { start: CLOSED } };

  const path = await saveProof(user.id, proof as File);
  if (!path) return { ok: false, fieldErrors: { proof: "We couldn't save that picture. Upload a screenshot (JPG or PNG) and try again." } };

  const amount = priceOf(b.sport, b.courts, b.hours);
  const { data: id, error } = await supabaseAdmin().rpc("book_court_rental", {
    p_satellite: SATELLITE_ID,
    p_user: user.id,
    p_dgroup: dgroup.id,
    p_sport: b.sport,
    p_date: b.date,
    p_start: b.start,
    p_hours: b.hours,
    p_courts: b.courts,
    p_capacity: sportInfo(b.sport)!.courts,
    p_amount: amount,
    p_proof: path,
    p_name: b.renterName,
    p_mobile: b.contactMobile,
    p_email: b.renterEmail,
  });
  if (error) {
    await deleteProof(path);
    refresh();
    if (isTaken(error)) return { ok: false, fieldErrors: { start: TAKEN } };
    console.error("reserveCourt failed", error);
    return { ok: false, formError: GENERIC };
  }

  const { data: row } = await supabaseAdmin().from("court_rentals").select("court_numbers").eq("id", id).maybeSingle();
  const courtNumbers = (row?.court_numbers as number[] | undefined) ?? [];
  const mail: RentalEmailData = {
    origin: siteOrigin(),
    id: id as string,
    renterName: b.renterName,
    sport: b.sport,
    date: b.date,
    start: b.start,
    hours: b.hours,
    courtNumbers,
    amount,
  };
  const [sent] = await Promise.all([
    sendEmail({ to: b.renterEmail, ...rentalEmail("confirmed", mail) }),
    sendEmail({ to: inbox(), ...adminRentalEmail({ ...mail, dgroupName: dgroup.name, mobile: b.contactMobile }) }),
  ]);
  refresh();
  return {
    ok: true,
    rental: {
      id: id as string,
      sport: sportName(b.sport),
      date: b.date,
      start: b.start,
      hours: b.hours,
      courts: courtsLabel(b.sport, courtNumbers),
      amount: peso(amount),
      email: b.renterEmail,
      emailed: sent.ok,
    },
  };
}

export interface CourtMoveResult {
  ok: boolean;
  formError?: string;
  summary?: string;
}

/**
 * Move one of the member's rentals to another day or start time, same sport,
 * hours and courts. Renters can't cancel (Adrian, 2026-10-20), so this is how
 * plans change, even on the day itself.
 */
export async function moveCourtRental(_prev: CourtMoveResult | null, formData: FormData): Promise<CourtMoveResult> {
  if (!hasSupabase()) return { ok: false, formError: GENERIC };
  const user = await currentUser();
  if (!user) return { ok: false, formError: "Sign in again to move this rental." };

  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = Number(formData.get("start"));
  const { data: r, error: readError } = await supabaseAdmin()
    .from("court_rentals")
    .select("sport, booked_on, start_hour, hours, renter_name, renter_email, amount_php")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (readError || !r) return { ok: false, formError: "That rental can't be moved any more." };

  const rental = r as { sport: Sport; booked_on: string; start_hour: number; hours: number; renter_name: string; renter_email: string; amount_php: number };
  const problem = moveError(rental, { date, start }, manilaDateKey(), manilaHour());
  if (problem) return { ok: false, formError: problem };
  if (await gymClosed(rental.sport, date, start, rental.hours)) return { ok: false, formError: CLOSED };

  const { data: courts, error } = await supabaseAdmin().rpc("move_court_rental", {
    p_id: id,
    p_user: user.id,
    p_date: date,
    p_start: start,
    p_capacity: sportInfo(rental.sport)!.courts,
  });
  if (error) {
    if (isTaken(error)) return { ok: false, formError: "Those courts are taken then. Your rental is unchanged." };
    console.error("moveCourtRental failed", error);
    return { ok: false, formError: GENERIC };
  }
  const courtNumbers = (courts as number[] | null) ?? [];
  await sendEmail({
    to: rental.renter_email,
    ...rentalEmail("moved", {
      origin: siteOrigin(),
      id,
      renterName: rental.renter_name,
      sport: rental.sport,
      date,
      start,
      hours: rental.hours,
      courtNumbers,
      amount: rental.amount_php,
    }),
  });
  refresh();
  return { ok: true, summary: `${courtsLabel(rental.sport, courtNumbers)} · ${dayLabel(date)}, ${timeRange(start, rental.hours)}` };
}

/**
 * Staff cancel a rental whose payment isn't there. The courts are freed and
 * the renter is emailed. Shaped for QueueActions.
 */
export async function setCourtRentalStatus(id: string, status: "cancelled"): Promise<AdminActionResult> {
  if (!isAdminConfigured()) return { ok: false, formError: "Admin is read-only: no access code configured." };
  if (!(await isAdmin())) return { ok: false, formError: "Not signed in." };
  if (!hasSupabase()) return { ok: false, formError: "Not connected to the database." };
  if (status !== "cancelled") return { ok: false, formError: "Rentals can only be cancelled here." };

  const db = supabaseAdmin();
  const { data: done, error } = await db.rpc("cancel_court_rental", { p_id: id });
  if (error) {
    console.error("setCourtRentalStatus failed", error);
    return { ok: false, formError: "Update failed. Try again." };
  }
  if (done) {
    const { data: r } = await db
      .from("court_rentals")
      .select("sport, booked_on, start_hour, hours, court_numbers, renter_name, renter_email, amount_php")
      .eq("id", id)
      .maybeSingle();
    if (r) {
      await sendEmail({
        to: r.renter_email as string,
        ...rentalEmail("cancelled", {
          origin: siteOrigin(),
          id,
          renterName: r.renter_name as string,
          sport: r.sport as string,
          date: r.booked_on as string,
          start: r.start_hour as number,
          hours: r.hours as number,
          courtNumbers: (r.court_numbers as number[]) ?? [],
          amount: r.amount_php as number,
        }),
      });
    }
  }
  refresh();
  return { ok: true };
}

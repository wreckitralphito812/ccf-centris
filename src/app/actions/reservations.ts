"use server";

import { revalidatePath } from "next/cache";

import { randomUUID } from "node:crypto";

import { hasSupabase, supabaseAdmin, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { parseReservation, parseRoomRequest, type FieldErrors } from "@/lib/validation";
import { referenceFor } from "@/lib/reference";
import { MINISTRY_ROOMS, ministryRoom, timeLabel, toMinutes, type Minutes } from "@/lib/ministry-rooms";
import { roomRequestEmail } from "@/lib/emails/room-request";
import { sendEmail, siteOrigin } from "@/lib/email";
import { fmtDayLong } from "@/lib/format";
import { CONTACT } from "@/lib/site";

export interface ReservationResult {
  ok: boolean;
  reference?: string;
  fieldErrors?: FieldErrors;
  formError?: string;
  needsAuth?: boolean;
}

/**
 * Create a facility reservation as `pending`, tied to the signed-in member.
 * An account is required — the booking still records denormalised contact
 * details (so it survives a deleted account) but always carries `user_id`.
 *
 * The database has an exclusion constraint on `during` per court/facility for
 * rows in `('pending','approved')`, so two overlapping requests cannot both
 * land. On that conflict Postgres raises `23P01` and we surface it as a
 * friendly "slot was just taken".
 */
export async function createReservation(
  _prev: ReservationResult | null,
  formData: FormData,
): Promise<ReservationResult> {
  if (!hasSupabase()) {
    return {
      ok: false,
      formError: "Bookings aren't wired up in this environment yet.",
    };
  }

  const {
    data: { user },
  } = await (await createSupabaseServer()).auth.getUser();
  if (!user) {
    return {
      ok: false,
      needsAuth: true,
      formError: "Please sign in to confirm this booking.",
    };
  }

  const parsed = parseReservation(formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const r = parsed.value;

  const db = supabaseAdmin();

  // Fall back to the profile for any contact detail the form didn't carry.
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email, mobile")
    .eq("id", user.id)
    .single();

  const contact_name = r.contact_name || profile?.full_name || user.email || "Member";
  const contact_email = r.contact_email || profile?.email || user.email || "";
  const contact_mobile = r.contact_mobile ?? profile?.mobile ?? null;

  const { data: facility, error: fErr } = await db
    .from("facilities")
    .select("id")
    .eq("satellite_id", SATELLITE_ID)
    .eq("slug", r.facility_slug)
    .single();

  if (fErr || !facility) {
    console.error("createReservation: facility lookup failed", fErr);
    return { ok: false, formError: "That space could not be found." };
  }

  const { data, error } = await db
    .from("reservations")
    .insert({
      satellite_id: SATELLITE_ID,
      facility_id: facility.id,
      court_id: r.court_id,
      user_id: user.id,
      contact_name,
      contact_email,
      contact_mobile,
      organization: r.organization,
      purpose: r.purpose,
      activity_name: r.activity_name,
      participants: r.participants,
      layout: r.layout,
      during: `[${r.starts_at},${r.ends_at})`,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        formError: "That slot was just taken. Pick another time.",
      };
    }
    console.error("createReservation: insert failed", error);
    return {
      ok: false,
      formError: "Something went wrong on our end. Try again in a moment.",
    };
  }

  revalidatePath("/centris/reserve");
  revalidatePath("/centris/availability");
  revalidatePath("/centris/sports");
  revalidatePath("/admin/reservations");
  revalidatePath("/my/reservations");

  return { ok: true, reference: referenceFor("reservation", data.id) };
}

// --- Ministry room requests ----------------------------------------------

/** Where new room requests are announced. The admin inbox unless overridden. */
const requestsInbox = () => process.env.ROOM_REQUESTS_EMAIL || CONTACT.messageEmail;

export interface RoomRequestResult {
  ok: boolean;
  reference?: string;
  emailed?: boolean;
  fieldErrors?: FieldErrors;
  formError?: string;
  needsAuth?: boolean;
}

/**
 * Send a room request. Every room becomes a `pending` reservation in one
 * insert, sharing a request_group, so either all rooms are held or none are:
 * the database's no-overlap rule rejects the whole insert if any one room is
 * taken. Then the admin inbox and the requester are emailed.
 */
export async function createRoomRequest(
  _prev: RoomRequestResult | null,
  formData: FormData,
): Promise<RoomRequestResult> {
  if (!hasSupabase()) {
    return { ok: false, formError: "Requests aren't connected in this environment yet." };
  }

  const {
    data: { user },
  } = await (await createSupabaseServer()).auth.getUser();
  if (!user?.email) {
    return { ok: false, needsAuth: true, formError: "Please sign in to send this request." };
  }

  const parsed = parseRoomRequest(formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const r = parsed.value;

  const db = supabaseAdmin();
  const { data: facilities, error: fErr } = await db
    .from("facilities")
    .select("id, slug")
    .eq("satellite_id", SATELLITE_ID)
    .in("slug", r.rooms);

  if (fErr || !facilities || facilities.length !== r.rooms.length) {
    console.error("createRoomRequest: facility lookup failed", fErr);
    return { ok: false, formError: "One of those rooms could not be found. Refresh the page and try again." };
  }

  const group = randomUUID();
  const { error } = await db.from("reservations").insert(
    facilities.map((f) => ({
      satellite_id: SATELLITE_ID,
      facility_id: f.id,
      user_id: user.id,
      request_group: group,
      contact_name: r.contact_name,
      contact_email: user.email,
      contact_mobile: r.contact_mobile,
      organization: r.ministry,
      activity_name: r.activity_name,
      participants: r.participants,
      layout: r.setup,
      equipment: r.equipment,
      food: r.food,
      purpose: r.notes,
      during: `[${r.starts_at},${r.ends_at})`,
      status: "pending",
    })),
  );

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        fieldErrors: { rooms: "Someone just requested one of those rooms for that time. Pick another room or time." },
      };
    }
    console.error("createRoomRequest: insert failed", error);
    return { ok: false, formError: "Something went wrong on our end. Try again in a moment." };
  }

  const reference = referenceFor("reservation", group);
  const mail = {
    origin: siteOrigin(),
    reference,
    requester: r.contact_name,
    requesterEmail: user.email,
    mobile: r.contact_mobile,
    activity: r.activity_name,
    ministry: r.ministry,
    rooms: r.rooms.map((slug) => ministryRoom(slug)!.name),
    when: whenLabel(r.starts_at, r.start, r.end),
    participants: r.participants,
    setup: r.setup,
    equipment: r.equipment,
    food: r.food,
    notes: r.notes,
  };
  const [receipt] = await Promise.all([
    sendEmail({ to: user.email, ...roomRequestEmail({ kind: "received", ...mail }) }),
    sendEmail({ to: requestsInbox(), ...roomRequestEmail({ kind: "admin", ...mail }) }),
  ]);

  revalidatePath("/centris/reserve");
  revalidatePath("/admin/reservations");
  revalidatePath("/my/reservations");

  return { ok: true, reference, emailed: receipt.ok };
}

/** "Saturday, 3 October, 9:00 AM to 12 NN" */
function whenLabel(startsAt: string, start: string, end: string): string {
  return `${fmtDayLong(startsAt)}, ${timeLabel(toMinutes(start))} to ${timeLabel(toMinutes(end))}`;
}

/**
 * When each ministry room is already held on a date, as minutes after
 * midnight in Manila. Pending requests count, since they hold the room too.
 * Only times: never who asked or what for.
 */
export async function roomBusyTimes(date: string): Promise<Record<string, [Minutes, Minutes][]>> {
  const out: Record<string, [Minutes, Minutes][]> = {};
  if (!hasSupabase() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return out;

  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  const range = `[${new Date(dayStart).toISOString()},${new Date(dayStart + 86_400_000).toISOString()})`;
  const db = supabaseAdmin();

  const { data: facilities } = await db
    .from("facilities")
    .select("id, slug")
    .eq("satellite_id", SATELLITE_ID)
    .in("slug", MINISTRY_ROOMS.map((m) => m.slug));
  if (!facilities?.length) return out;
  const slugOf = new Map(facilities.map((f) => [f.id as string, f.slug as string]));
  const ids = [...slugOf.keys()];

  const [{ data: held }, { data: blocked }] = await Promise.all([
    db
      .from("reservations")
      .select("facility_id, during")
      .in("facility_id", ids)
      .is("court_id", null)
      .in("status", ["pending", "approved"])
      .overlaps("during", range),
    db.from("facility_blackouts").select("facility_id, during").in("facility_id", ids).overlaps("during", range),
  ]);

  const minutes = (iso: string) =>
    Math.min(1440, Math.max(0, Math.round((new Date(iso).getTime() - dayStart) / 60_000)));

  for (const row of [...(held ?? []), ...(blocked ?? [])]) {
    const slug = slugOf.get(row.facility_id as string);
    const m = /[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/.exec(row.during as string);
    if (!slug || !m) continue;
    (out[slug] ??= []).push([minutes(m[1]), minutes(m[2])]);
  }
  return out;
}

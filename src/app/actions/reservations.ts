"use server";

import { revalidatePath } from "next/cache";

import { hasSupabase, supabaseAdmin, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { parseReservation, type FieldErrors } from "@/lib/validation";
import { referenceFor } from "@/lib/reference";

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
      formError: "Something went wrong on our end — try again in a moment.",
    };
  }

  revalidatePath("/centris/reserve");
  revalidatePath("/centris/availability");
  revalidatePath("/centris/sports");
  revalidatePath("/admin/reservations");
  revalidatePath("/my/reservations");

  return { ok: true, reference: referenceFor("reservation", data.id) };
}

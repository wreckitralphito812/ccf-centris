"use server";

import { revalidatePath } from "next/cache";

import {
  bookingOpen,
  candidateTables,
  manilaMinutes,
  nightLabel,
  parseDgroupBooking,
  parseDgroupChange,
  slotLabel,
  tableKey,
  tablesLabel,
  type DgroupFieldErrors,
} from "@/lib/dgroup-tables";
import { bookingEmail, type BookingEmailKind } from "@/lib/emails/dgroup-booking";
import { sendEmail, siteOrigin } from "@/lib/email";
import { manilaDateKey } from "@/lib/format";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { currentUser } from "@/lib/supabase/ssr";

export interface DgroupBookingResult {
  ok: boolean;
  fieldErrors?: DgroupFieldErrors;
  formError?: string;
  needsAuth?: boolean;
  booking?: {
    roomSlug: string;
    roomName: string;
    labels: string[];
    tables: string;
    night: string;
    slot: string;
    groupSize: number;
    email: string;
    emailed: boolean;
  };
}

const GENERIC = "Something went wrong on our end. Try again in a moment.";

/**
 * Lets a non-production deploy (a Vercel preview, or local dev) try the booking
 * flow before it opens on October 4. Never applies in production.
 */
function bookingPreview(): boolean {
  return process.env.DGROUP_BOOKING_PREVIEW === "1" && process.env.VERCEL_ENV !== "production";
}

/** Tables already held for a day and slot, as tableKey()s. */
async function takenTables(date: string, slotId: string, exceptBooking?: string) {
  const { data, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .select("id, room_slug, table_labels")
    .eq("satellite_id", SATELLITE_ID)
    .eq("booked_on", date)
    .eq("slot_id", slotId)
    .in("status", ["pending", "confirmed"]);
  if (error) throw error;
  const taken = new Set<string>();
  for (const r of (data ?? []) as { id: string; room_slug: string; table_labels: string[] }[]) {
    if (r.id === exceptBooking) continue;
    for (const l of r.table_labels) taken.add(tableKey(r.room_slug, l));
  }
  return taken;
}

const isConflict = (e: { code?: string; message?: string; details?: string | null }, name: string) =>
  e.code === "23505" && `${e.message ?? ""} ${e.details ?? ""}`.includes(name);

async function notify(
  kind: BookingEmailKind,
  to: string | null,
  b: {
    leader_name: string;
    room_slug: string;
    table_labels: string[];
    booked_on: string;
    slot_id: string;
    group_size: number;
  },
) {
  if (!to) return false;
  const mail = bookingEmail({
    kind,
    origin: siteOrigin(),
    leaderName: b.leader_name,
    roomSlug: b.room_slug,
    labels: b.table_labels,
    date: b.booked_on,
    slotId: b.slot_id,
    groupSize: b.group_size,
  });
  return (await sendEmail({ to, ...mail })).ok;
}

function refresh() {
  revalidatePath("/reserve/dgroup");
  revalidatePath("/admin/dgroup-tables");
}

/**
 * Book tables for one Dgroup meeting: one day, one slot. The site picks the
 * room and tables (see candidateTables): one table when one fits, joined
 * neighbours when the group needs more seats. The booking is confirmed at once
 * and the leader is emailed the table numbers and floor plan.
 *
 * Two leaders booking at the same moment can't collide: book_dgroup_tables
 * writes the booking and its table holds together, the holds' unique index
 * refuses a taken table, and we move on to the next best set.
 */
export async function reserveDgroupTable(
  _prev: DgroupBookingResult | null,
  formData: FormData,
): Promise<DgroupBookingResult> {
  if (!hasSupabase()) {
    return { ok: false, formError: "Table reservations aren't switched on yet." };
  }
  const today = manilaDateKey();
  if (!bookingOpen(today, bookingPreview())) {
    return { ok: false, formError: "Dgroup table reservations open on Sunday, October 4." };
  }
  const user = await currentUser();
  if (!user) return { ok: false, needsAuth: true, formError: "Sign in to reserve a table." };

  const parsed = parseDgroupBooking(formData, today, manilaMinutes());
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const b = parsed.value;
  const db = supabaseAdmin();

  let taken: Set<string>;
  try {
    taken = await takenTables(b.date, b.slotId);
  } catch (e) {
    console.error("reserveDgroupTable: read failed", e);
    return { ok: false, formError: GENERIC };
  }

  for (const choice of candidateTables(b.groupSize, taken)) {
    const { error } = await db.rpc("book_dgroup_tables", {
      p_satellite: SATELLITE_ID,
      p_user: user.id,
      p_room: choice.roomSlug,
      p_labels: choice.labels,
      p_seats: choice.seats,
      p_date: b.date,
      p_slot: b.slotId,
      p_name: b.leaderName,
      p_mobile: b.contactMobile,
      p_email: b.leaderEmail,
      p_size: b.groupSize,
    });

    if (!error) {
      const emailed = await notify("confirmed", b.leaderEmail, {
        leader_name: b.leaderName,
        room_slug: choice.roomSlug,
        table_labels: choice.labels,
        booked_on: b.date,
        slot_id: b.slotId,
        group_size: b.groupSize,
      });
      refresh();
      return {
        ok: true,
        booking: {
          roomSlug: choice.roomSlug,
          roomName: choice.roomName,
          labels: choice.labels,
          tables: tablesLabel(choice.labels),
          night: nightLabel(b.date),
          slot: slotLabel(b.slotId),
          groupSize: b.groupSize,
          email: b.leaderEmail,
          emailed,
        },
      };
    }
    if (isConflict(error, "one_per_member")) {
      return {
        ok: false,
        formError:
          "You already have a booking for that day and time. Change it under “Your bookings” instead.",
      };
    }
    if (error.code !== "23505") {
      console.error("reserveDgroupTable: booking failed", error);
      return { ok: false, formError: GENERIC };
    }
    // Another leader took one of these tables a moment ago. Try the next set.
  }

  return {
    ok: false,
    formError: `Every table is taken for ${b.groupSize} at that time. Try another day or time slot.`,
  };
}

export interface DgroupChangeResult {
  ok: boolean;
  fieldErrors?: DgroupFieldErrors;
  formError?: string;
  summary?: string;
}

/**
 * Change one of the member's bookings: its day, time slot, or headcount. The
 * tables are reassigned from scratch for the new details, with the booking's
 * own current tables counted as free, so a group that only grew by one can
 * keep its table when it still fits. On success the leader gets an updated
 * email.
 */
export async function changeDgroupBooking(
  _prev: DgroupChangeResult | null,
  formData: FormData,
): Promise<DgroupChangeResult> {
  if (!hasSupabase()) return { ok: false, formError: GENERIC };
  const user = await currentUser();
  if (!user) return { ok: false, formError: "Sign in again to change this booking." };

  const id = String(formData.get("id") ?? "");
  const today = manilaDateKey();
  const parsed = parseDgroupChange(formData, today, manilaMinutes());
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const c = parsed.value;
  const db = supabaseAdmin();

  const { data: current, error: readError } = await db
    .from("dgroup_table_bookings")
    .select("id, leader_name, leader_email, room_slug, table_labels, booked_on, slot_id, group_size")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (readError || !current) return { ok: false, formError: "That booking can't be changed any more." };

  if (
    current.booked_on === c.date &&
    current.slot_id === c.slotId &&
    current.group_size === c.groupSize
  ) {
    return { ok: false, formError: "Nothing changed. Pick a new time or headcount." };
  }

  let taken: Set<string>;
  try {
    taken = await takenTables(c.date, c.slotId, id);
  } catch (e) {
    console.error("changeDgroupBooking: read failed", e);
    return { ok: false, formError: GENERIC };
  }

  // Keep the same tables when the day and slot are unchanged and they still fit.
  const candidates = candidateTables(c.groupSize, taken);
  const sameSlot = current.booked_on === c.date && current.slot_id === c.slotId;
  const keep = sameSlot
    ? candidates.find(
        (t) =>
          t.roomSlug === current.room_slug &&
          t.labels.join(",") === (current.table_labels as string[]).join(","),
      )
    : undefined;
  const ordered = keep ? [keep, ...candidates.filter((t) => t !== keep)] : candidates;

  for (const choice of ordered) {
    const { error } = await db.rpc("move_dgroup_booking", {
      p_id: id,
      p_user: user.id,
      p_room: choice.roomSlug,
      p_labels: choice.labels,
      p_seats: choice.seats,
      p_date: c.date,
      p_slot: c.slotId,
      p_size: c.groupSize,
    });
    if (!error) {
      await notify("changed", current.leader_email as string | null, {
        leader_name: current.leader_name as string,
        room_slug: choice.roomSlug,
        table_labels: choice.labels,
        booked_on: c.date,
        slot_id: c.slotId,
        group_size: c.groupSize,
      });
      refresh();
      return {
        ok: true,
        summary: `${tablesLabel(choice.labels)}, ${choice.roomName} · ${nightLabel(c.date)}, ${slotLabel(c.slotId)}`,
      };
    }
    if (isConflict(error, "one_per_member")) {
      return { ok: false, formError: "You already have another booking at that day and time." };
    }
    if (error.code !== "23505") {
      console.error("changeDgroupBooking failed", error);
      return { ok: false, formError: GENERIC };
    }
  }
  return {
    ok: false,
    formError: `No tables are free for ${c.groupSize} at that time. Your booking is unchanged.`,
  };
}

/** Cancel one of the member's bookings. Its tables are released at once. */
export async function cancelDgroupBooking(formData: FormData): Promise<void> {
  if (!hasSupabase()) return;
  const user = await currentUser();
  if (!user) return;
  const { data, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", String(formData.get("id") ?? ""))
    .eq("user_id", user.id)
    .in("status", ["pending", "confirmed"])
    .select("leader_name, leader_email, room_slug, table_labels, booked_on, slot_id, group_size")
    .maybeSingle();
  if (error) console.error("cancelDgroupBooking failed", error);
  if (data) await notify("cancelled", data.leader_email as string | null, data as never);
  refresh();
}

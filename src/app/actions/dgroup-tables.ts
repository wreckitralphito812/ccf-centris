"use server";

import { revalidatePath } from "next/cache";

import {
  candidateTables,
  manilaMinutes,
  nightLabel,
  parseDgroupBooking,
  parseDgroupChange,
  rebookDate,
  slotLabel,
  tablesLabel,
  type DgroupBookingInput,
  type DgroupFieldErrors,
} from "@/lib/dgroup-tables";
import { bookingEmail, type BookingEmailKind } from "@/lib/emails/dgroup-booking";
import { sendEmail, siteOrigin } from "@/lib/email";
import { manilaDateKey } from "@/lib/format";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/session";
import { takenTables } from "@/lib/dgroup-taken";

export interface DgroupBookingResult {
  ok: boolean;
  fieldErrors?: DgroupFieldErrors;
  formError?: string;
  needsAuth?: boolean;
  booking?: {
    /** The new booking's id, for Book again. */
    id: string;
    roomSlug: string;
    roomName: string;
    labels: string[];
    tables: string;
    night: string;
    slot: string;
    /** Raw "YYYY-MM-DD" and slot id, for Add to calendar. */
    date: string;
    slotId: string;
    groupSize: number;
    email: string;
    emailed: boolean;
  };
}

const GENERIC = "Something went wrong on our end. Try again in a moment.";

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
  revalidatePath("/my/reservations");
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
  const user = await currentUser();
  if (!user) return { ok: false, needsAuth: true, formError: "Sign in to reserve a table." };

  const parsed = parseDgroupBooking(formData, today, manilaMinutes());
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const result = await bookTables(user.id, parsed.value);
  if (result.ok && result.booking) await linkDgroup(user.id, result.booking.id, String(formData.get("dgroup_id") ?? ""));
  return result;
}

/**
 * Note which Dgroup a booking is for (2026-10-08), so the team sees which
 * groups meet at Centris. Only the member's own approved Dgroup counts; a
 * failure here never undoes the booking.
 */
async function linkDgroup(memberId: string, bookingId: string, dgroupId: string | null) {
  if (!dgroupId || !/^[0-9a-f-]{36}$/i.test(dgroupId)) return;
  const db = supabaseAdmin();
  const { data: mine } = await db
    .from("dgroups")
    .select("id")
    .eq("id", dgroupId)
    .eq("satellite_id", SATELLITE_ID)
    .eq("leader_id", memberId)
    .eq("status", "approved")
    .maybeSingle();
  if (!mine) return;
  const { error } = await db.from("dgroup_table_bookings").update({ dgroup_id: dgroupId }).eq("id", bookingId).eq("user_id", memberId);
  if (error) console.error("linkDgroup failed", error);
}

/**
 * Book the same weekday, time and headcount again at the next open date
 * (rebookDate), for the leader who owns `id`. It reuses the booking's own
 * leader details, and the policies were already accepted for this group
 * (2026-09-30).
 */
export async function rebookDgroupTable(id: string): Promise<DgroupBookingResult> {
  if (!hasSupabase()) return { ok: false, formError: GENERIC };
  const today = manilaDateKey();
  const user = await currentUser();
  if (!user) return { ok: false, needsAuth: true, formError: "Sign in again to book." };

  const { data: row, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .select("booked_on, slot_id, group_size, leader_name, leader_email, contact_mobile, dgroup_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !row) return { ok: false, formError: "That booking can’t be found." };

  const date = rebookDate(row.booked_on as string, row.slot_id as string, today, manilaMinutes());
  if (!date) return { ok: false, formError: "That day isn’t open yet. Days open 8 days ahead." };

  const result = await bookTables(user.id, {
    date,
    slotId: row.slot_id as string,
    groupSize: row.group_size as number,
    leaderName: row.leader_name as string,
    contactMobile: row.contact_mobile as string,
    leaderEmail: (row.leader_email as string | null) ?? user.email,
  });
  if (result.ok && result.booking) await linkDgroup(user.id, result.booking.id, row.dgroup_id as string | null);
  return result;
}

/**
 * Assign and hold tables for one booking, then email the leader. Shared by a
 * new booking and Book again.
 */
async function bookTables(userId: string, b: DgroupBookingInput): Promise<DgroupBookingResult> {
  const db = supabaseAdmin();

  let taken: Set<string>;
  try {
    taken = await takenTables(b.date, b.slotId);
  } catch (e) {
    console.error("reserveDgroupTable: read failed", e);
    return { ok: false, formError: GENERIC };
  }

  for (const choice of candidateTables(b.groupSize, taken)) {
    const { data: bookingId, error } = await db.rpc("book_dgroup_tables", {
      p_satellite: SATELLITE_ID,
      p_user: userId,
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
          id: bookingId as string,
          roomSlug: choice.roomSlug,
          roomName: choice.roomName,
          labels: choice.labels,
          tables: tablesLabel(choice.labels),
          night: nightLabel(b.date),
          slot: slotLabel(b.slotId),
          date: b.date,
          slotId: b.slotId,
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

  // Shown at the time question, and the refresh updates the form's counts.
  refresh();
  return {
    ok: false,
    fieldErrors: {
      slotId: `That time just filled up for ${b.groupSize}. Pick another time or day.`,
    },
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

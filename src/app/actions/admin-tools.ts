"use server";

import { revalidatePath } from "next/cache";

import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { BOARD_ROOMS, isDateKey } from "@/lib/admin-day";
import {
  candidateTables,
  DGROUP_NIGHTS,
  DGROUP_SLOTS,
  nightLabel,
  roomName,
  slotLabel,
  tablesLabel,
} from "@/lib/dgroup-tables";
import { takenTables } from "@/lib/dgroup-taken";
import { sendEmail, siteOrigin } from "@/lib/email";
import { bookingEmail } from "@/lib/emails/dgroup-booking";
import { manilaDateKey } from "@/lib/format";
import { closeDays, manilaInstant, parseTablePicks, tableBlockRows } from "@/lib/close-range";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Admin tools for tables and rooms (2026-10-03): block tables or rooms, and
 * move a Dgroup booking. Every action checks the shared admin code first.
 */

export interface ToolResult {
  ok: boolean;
  formError?: string;
  message?: string;
}

async function guard(): Promise<ToolResult | null> {
  if (!isAdminConfigured()) return { ok: false, formError: "Admin is read-only: no access code configured." };
  if (!(await isAdmin())) return { ok: false, formError: "Not signed in." };
  if (!hasSupabase()) return { ok: false, formError: "Not connected to the database." };
  return null;
}

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function refresh() {
  for (const p of ["/admin/blocks", "/admin/today", "/admin/week", "/admin/bookings", "/reserve/dgroup", "/centris/reserve"]) {
    revalidatePath(p);
  }
}

// --- Closing rooms and tables ----------------------------------------------------

/**
 * Close any number of rooms and Dgroup tables, from one day and time until
 * another (Adrian, 2026-11-14; it used to be one room or one table, one day).
 * Saved one day at a time (see lib/close-range), so every board and form
 * reads it as before. Bookings already made are kept, and counted in the
 * message so the admin can decide.
 */
export async function closeRoomsAndTables(_prev: ToolResult | null, fd: FormData): Promise<ToolResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const rooms = BOARD_ROOMS.filter((r) => fd.getAll("room").map(String).includes(r.slug));
  const picks = parseTablePicks(fd.getAll("table").map(String));
  if (!rooms.length && !picks.length) return { ok: false, formError: "Tick at least one room or table." };

  const span = closeDays(field(fd, "from_date"), field(fd, "from_time"), field(fd, "to_date"), field(fd, "to_time"));
  if (!span.ok) return { ok: false, formError: span.error };
  if (span.days[span.days.length - 1].date < manilaDateKey()) return { ok: false, formError: "That time has passed." };
  const reason = field(fd, "reason").slice(0, 200) || null;
  const db = supabaseAdmin();

  let facilities: { id: string; slug: string }[] = [];
  if (rooms.length) {
    const { data } = await db
      .from("facilities")
      .select("id, slug")
      .eq("satellite_id", SATELLITE_ID)
      .in("slug", rooms.map((r) => r.slug));
    facilities = (data ?? []) as { id: string; slug: string }[];
    const missing = rooms.find((r) => !facilities.some((f) => f.slug === r.slug));
    if (missing) return { ok: false, formError: `${missing.name} isn't set up in the database.` };
  }

  const ranges = span.days.map((d) => `[${manilaInstant(d.date, d.from)},${manilaInstant(d.date, d.to)})`);
  const tableRows = tableBlockRows(span.days, picks);
  if (picks.length && !tableRows.length) {
    return { ok: false, formError: "Dgroup tables are only booked Tuesday to Friday, 1:00 to 9:30 PM. Pick days and times inside that." };
  }

  if (facilities.length) {
    const { error } = await db
      .from("facility_blackouts")
      .insert(facilities.flatMap((f) => ranges.map((during) => ({ facility_id: f.id, during, reason }))));
    if (error) {
      console.error("closeRoomsAndTables: rooms failed", error);
      return { ok: false, formError: "Couldn't close the rooms. Try again." };
    }
  }
  if (tableRows.length) {
    const { error } = await db
      .from("dgroup_table_blocks")
      .insert(tableRows.map((r) => ({ ...r, satellite_id: SATELLITE_ID, reason })));
    if (error) {
      console.error("closeRoomsAndTables: tables failed", error);
      refresh();
      return {
        ok: false,
        formError: facilities.length ? "The rooms are closed, but the tables couldn't be. Try the tables again." : "Couldn't close the tables. Try again.",
      };
    }
  }

  // What's already booked in that time is kept; say how much, so the admin can decide.
  const [roomClash, tableClash] = await Promise.all([
    facilities.length
      ? Promise.all(
          ranges.map((during) =>
            db
              .from("reservations")
              .select("id")
              .in("facility_id", facilities.map((f) => f.id))
              .in("status", ["pending", "approved"])
              .overlaps("during", during),
          ),
        ).then((rs) => new Set(rs.flatMap((r) => (r.data ?? []).map((x) => x.id as string))).size)
      : Promise.resolve(0),
    tableRows.length
      ? db
          .from("dgroup_table_bookings")
          .select("id, room_slug, table_labels, booked_on, slot_id")
          .eq("satellite_id", SATELLITE_ID)
          .in("booked_on", [...new Set(tableRows.map((r) => r.booked_on))])
          .in("status", ["pending", "confirmed"])
          .then(
            ({ data }) =>
              (data ?? []).filter((b) =>
                tableRows.some(
                  (r) =>
                    r.room_slug === b.room_slug &&
                    r.booked_on === b.booked_on &&
                    (!r.slot_id || r.slot_id === b.slot_id) &&
                    (!r.table_label || (b.table_labels as string[]).includes(r.table_label)),
                ),
              ).length,
          )
      : Promise.resolve(0),
  ]);

  refresh();
  const what = [rooms.length ? `${rooms.length} ${rooms.length === 1 ? "room" : "rooms"}` : null, picks.length ? "the Dgroup tables" : null]
    .filter(Boolean)
    .join(" and ");
  const kept = [
    roomClash ? `${roomClash} room request${roomClash === 1 ? "" : "s"}` : null,
    tableClash ? `${tableClash} Dgroup table booking${tableClash === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return {
    ok: true,
    message: kept.length
      ? `Closed ${what}. ${kept.join(" and ")} already in that time ${kept.length === 1 && (roomClash + tableClash) === 1 ? "was" : "were"} kept; decline or cancel from Today if needed.`
      : `Closed ${what} for ${span.days.length} ${span.days.length === 1 ? "day" : "days"}. Nobody can book them then.`,
  };
}

export async function removeTableBlock(fd: FormData): Promise<void> {
  if (await guard()) return;
  const { error } = await supabaseAdmin()
    .from("dgroup_table_blocks")
    .delete()
    .eq("id", field(fd, "id"))
    .eq("satellite_id", SATELLITE_ID);
  if (error) console.error("removeTableBlock failed", error);
  refresh();
}

// --- Room blocks (facility_blackouts) -------------------------------------------

export async function removeRoomBlock(fd: FormData): Promise<void> {
  if (await guard()) return;
  const { error } = await supabaseAdmin().from("facility_blackouts").delete().eq("id", field(fd, "id"));
  if (error) console.error("removeRoomBlock failed", error);
  refresh();
}

// --- Move a Dgroup booking ---------------------------------------------------------

/**
 * Move a confirmed Dgroup booking to another weekday and time. Tables are
 * reassigned the same way a member's change is (same tables first if they're
 * free), through move_dgroup_booking so the swap is all-or-nothing, and the
 * leader is emailed the new details.
 */
export async function adminMoveDgroupBooking(_prev: ToolResult | null, fd: FormData): Promise<ToolResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = field(fd, "id");
  const date = field(fd, "date");
  const slot = field(fd, "slot");
  if (!isDateKey(date)) return { ok: false, formError: "Choose a date." };
  if (date < manilaDateKey()) return { ok: false, formError: "That day has passed." };
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!DGROUP_NIGHTS.includes(weekday)) return { ok: false, formError: "Dgroup tables are Tuesday to Friday." };
  if (!DGROUP_SLOTS.some((s) => s.id === slot)) return { ok: false, formError: "Choose a time." };

  const db = supabaseAdmin();
  const { data: b } = await db
    .from("dgroup_table_bookings")
    .select("id, user_id, status, group_size, room_slug, table_labels, leader_name, leader_email, booked_on, slot_id")
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .maybeSingle();
  if (!b || b.status !== "confirmed") return { ok: false, formError: "That booking can't be moved." };
  if (b.booked_on === date && b.slot_id === slot) return { ok: false, formError: "Pick a different day or time." };

  let taken: Set<string>;
  try {
    taken = await takenTables(date, slot, id);
  } catch (e) {
    console.error("adminMoveDgroupBooking: read failed", e);
    return { ok: false, formError: "Couldn't check the tables. Try again." };
  }

  const candidates = candidateTables(b.group_size as number, taken);
  const same = candidates.find(
    (t) => t.roomSlug === b.room_slug && t.labels.join(",") === (b.table_labels as string[]).join(","),
  );
  const ordered = same ? [same, ...candidates.filter((t) => t !== same)] : candidates;

  for (const choice of ordered) {
    const { error } = await db.rpc("move_dgroup_booking", {
      p_id: id,
      p_user: b.user_id,
      p_room: choice.roomSlug,
      p_labels: choice.labels,
      p_seats: choice.seats,
      p_date: date,
      p_slot: slot,
      p_size: b.group_size,
    });
    if (!error) {
      if (b.leader_email) {
        await sendEmail({
          to: b.leader_email as string,
          ...bookingEmail({
            kind: "changed",
            origin: siteOrigin(),
            leaderName: b.leader_name as string,
            roomSlug: choice.roomSlug,
            labels: choice.labels,
            date,
            slotId: slot,
            groupSize: b.group_size as number,
          }),
        });
      }
      refresh();
      revalidatePath("/my/reservations");
      return {
        ok: true,
        message: `Moved to ${tablesLabel(choice.labels)}, ${roomName(choice.roomSlug)} · ${nightLabel(date)}, ${slotLabel(slot)}. ${b.leader_email ? "The leader was emailed." : ""}`.trim(),
      };
    }
    if (error.code === "23505" && `${error.message} ${error.details ?? ""}`.includes("one_per_member")) {
      return { ok: false, formError: "That leader already has another booking at that day and time." };
    }
    if (error.code !== "23505") {
      console.error("adminMoveDgroupBooking failed", error);
      return { ok: false, formError: "Couldn't move the booking. Try again." };
    }
  }
  return { ok: false, formError: `No tables are free for ${b.group_size} then. The booking is unchanged.` };
}

/**
 * Hide or show a Prayer Wall post or reply from the admin console
 * (2026-10-14). Until now only members with the prayer-team role could, from
 * the wall itself, and no staff account had it. Hiding also clears its
 * reports; members never see who hid it.
 */
export async function adminSetPrayerHidden(fd: FormData): Promise<void> {
  if (await guard()) return;
  const kind = field(fd, "kind");
  const id = field(fd, "id");
  if (!id || (kind !== "post" && kind !== "reply")) return;
  const hide = field(fd, "hide") === "1";
  const db = supabaseAdmin();
  const { error } = await db
    .from(kind === "post" ? "prayer_wall_posts" : "prayer_wall_replies")
    .update({ hidden_at: hide ? new Date().toISOString() : null, hidden_by: null })
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID);
  if (error) console.error("adminSetPrayerHidden failed", error);
  await resolvePrayerReports(kind, id);
  revalidatePath("/admin/prayer");
  revalidatePath("/prayer-wall");
}

/** "Looks fine": clear the reports on a post or reply without hiding it. */
export async function adminDismissPrayerReports(fd: FormData): Promise<void> {
  if (await guard()) return;
  const kind = field(fd, "kind");
  const id = field(fd, "id");
  if (!id || (kind !== "post" && kind !== "reply")) return;
  await resolvePrayerReports(kind, id);
  revalidatePath("/admin/prayer");
}

async function resolvePrayerReports(kind: string, id: string) {
  const { error } = await supabaseAdmin()
    .from("prayer_wall_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq(kind === "post" ? "post_id" : "reply_id", id)
    .eq("satellite_id", SATELLITE_ID)
    .is("resolved_at", null);
  if (error) console.error("resolvePrayerReports failed", error);
}

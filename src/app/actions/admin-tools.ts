"use server";

import { revalidatePath } from "next/cache";

import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { isDateKey } from "@/lib/admin-day";
import {
  candidateTables,
  DGROUP_ROOMS,
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
import { MINISTRY_ROOMS, toMinutes } from "@/lib/ministry-rooms";
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

// --- Dgroup table blocks -------------------------------------------------------

export async function addTableBlock(_prev: ToolResult | null, fd: FormData): Promise<ToolResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const room = field(fd, "room");
  const table = field(fd, "table") || null;
  const date = field(fd, "date");
  const slot = field(fd, "slot") || null;
  const reason = field(fd, "reason").slice(0, 200) || null;

  const rooms = room === "all" ? DGROUP_ROOMS : DGROUP_ROOMS.filter((r) => r.slug === room);
  if (!rooms.length) return { ok: false, formError: "Choose a room." };
  if (!isDateKey(date)) return { ok: false, formError: "Choose a date." };
  if (date < manilaDateKey()) return { ok: false, formError: "That day has passed." };
  if (slot && !DGROUP_SLOTS.some((s) => s.id === slot)) return { ok: false, formError: "Choose a time." };
  if (table && (rooms.length !== 1 || !rooms[0].tables.some((t) => t.label === table))) {
    return { ok: false, formError: `There's no Table ${table} in that room.` };
  }

  const db = supabaseAdmin();
  const { error } = await db.from("dgroup_table_blocks").insert(
    rooms.map((r) => ({
      satellite_id: SATELLITE_ID,
      room_slug: r.slug,
      table_label: table,
      booked_on: date,
      slot_id: slot,
      reason,
    })),
  );
  if (error) {
    console.error("addTableBlock failed", error);
    return { ok: false, formError: "Couldn't save the block. Try again." };
  }

  // Bookings already on those tables are kept; the admin decides.
  let q = db
    .from("dgroup_table_bookings")
    .select("table_labels, room_slug")
    .eq("satellite_id", SATELLITE_ID)
    .eq("booked_on", date)
    .in("room_slug", rooms.map((r) => r.slug))
    .in("status", ["pending", "confirmed"]);
  if (slot) q = q.eq("slot_id", slot);
  const { data: clash } = await q;
  const hit = (clash ?? []).filter((b) => !table || (b.table_labels as string[]).includes(table)).length;

  refresh();
  return {
    ok: true,
    message: hit
      ? `Blocked. ${hit} booking${hit === 1 ? " is" : "s are"} already on those tables and ${hit === 1 ? "was" : "were"} kept; cancel from Today if needed.`
      : "Blocked. Members now see those tables as taken.",
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

export async function addRoomBlock(_prev: ToolResult | null, fd: FormData): Promise<ToolResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const slug = field(fd, "room");
  const date = field(fd, "date");
  const start = field(fd, "start");
  const end = field(fd, "end");
  const reason = field(fd, "reason").slice(0, 200) || null;

  const room = MINISTRY_ROOMS.find((r) => r.slug === slug);
  if (!room) return { ok: false, formError: "Choose a room." };
  if (!isDateKey(date)) return { ok: false, formError: "Choose a date." };
  if (date < manilaDateKey()) return { ok: false, formError: "That day has passed." };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || toMinutes(end) <= toMinutes(start)) {
    return { ok: false, formError: "Choose a start time before the end time." };
  }

  const db = supabaseAdmin();
  const { data: facility } = await db
    .from("facilities")
    .select("id")
    .eq("satellite_id", SATELLITE_ID)
    .eq("slug", slug)
    .maybeSingle();
  if (!facility) return { ok: false, formError: "That room isn't set up in the database." };

  const during = `[${new Date(`${date}T${start}:00+08:00`).toISOString()},${new Date(`${date}T${end}:00+08:00`).toISOString()})`;
  const { error } = await db.from("facility_blackouts").insert({ facility_id: facility.id, during, reason });
  if (error) {
    console.error("addRoomBlock failed", error);
    return { ok: false, formError: "Couldn't save the block. Try again." };
  }

  const { data: clash } = await db
    .from("reservations")
    .select("id")
    .eq("facility_id", facility.id)
    .in("status", ["pending", "approved"])
    .overlaps("during", during);
  const hit = clash?.length ?? 0;

  refresh();
  return {
    ok: true,
    message: hit
      ? `Blocked. ${hit} request${hit === 1 ? " overlaps" : "s overlap"} that time and ${hit === 1 ? "was" : "were"} kept; decline or cancel from Reservations if needed.`
      : `Blocked. ${room.name} can't be requested then.`,
  };
}

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
  if (weekday === 0 || weekday === 6) return { ok: false, formError: "Dgroup tables are Monday to Friday." };
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

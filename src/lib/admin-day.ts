/**
 * The admin Today board (2026-10-03): one day of bookings, shaped for the
 * facilities team. Dgroup tables by time slot and room (for the floor plans),
 * and room requests as blocks on each room's timeline. Pure, so it's tested
 * without a database; the page passes in rows from queries.ts.
 */
import { DGROUP_ROOMS, DGROUP_SLOTS, type DgroupSlot } from "@/lib/dgroup-tables";
import { MINISTRY_ROOMS } from "@/lib/ministry-rooms";

export interface DayTable {
  id: string;
  leader_name: string;
  contact_mobile: string;
  group_size: number;
  room_slug: string;
  table_labels: string[];
  booked_on: string;
  slot_id: string;
  status: string;
}

export interface DayRoomBooking {
  id: string;
  contact_name: string;
  contact_mobile: string | null;
  organization: string | null;
  activity_name: string | null;
  participants: number;
  facility_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

/** The room timeline runs from the center's first slot to its last. */
export const DAY_START = 9 * 60;
export const DAY_END = 21 * 60 + 30;

const H8 = 8 * 3_600_000;
/** Manila "YYYY-MM-DD" of an instant. */
export const manilaDay = (iso: string) => new Date(new Date(iso).getTime() + H8).toISOString().slice(0, 10);
/** Minutes after Manila midnight. */
export const manilaMinutesOf = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + H8);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const LIVE_TABLE = ["pending", "confirmed"];
const LIVE_ROOM = ["pending", "approved"];

export interface DayBoard {
  date: string;
  slots: {
    slot: DgroupSlot;
    rooms: { slug: string; name: string; bookings: DayTable[]; labels: string[] }[];
    groups: number;
  }[];
  rooms: {
    name: string;
    blocks: (DayRoomBooking & { from: number; to: number })[];
  }[];
  stats: { groups: number; people: number; roomsBooked: number; awaiting: number };
}

export function buildDayBoard(date: string, tables: DayTable[], rooms: DayRoomBooking[]): DayBoard {
  const dayTables = tables.filter((t) => t.booked_on === date && LIVE_TABLE.includes(t.status));
  const slots = DGROUP_SLOTS.map((slot) => {
    const inSlot = dayTables.filter((t) => t.slot_id === slot.id);
    return {
      slot,
      groups: inSlot.length,
      rooms: DGROUP_ROOMS.map((r) => {
        const bookings = inSlot
          .filter((t) => t.room_slug === r.slug)
          .sort((a, b) => Number(a.table_labels[0]) - Number(b.table_labels[0]));
        return { slug: r.slug, name: r.name, bookings, labels: bookings.flatMap((b) => b.table_labels) };
      }),
    };
  });

  const dayRooms = rooms.filter((r) => LIVE_ROOM.includes(r.status) && manilaDay(r.starts_at) === date);
  const names = [
    ...MINISTRY_ROOMS.map((r) => r.name),
    // Anything booked under a name the list doesn't know still shows.
    ...[...new Set(dayRooms.map((r) => r.facility_name ?? "Other"))].filter(
      (n) => !MINISTRY_ROOMS.some((r) => r.name === n),
    ),
  ];
  const roomRows = names.map((name) => ({
    name,
    blocks: dayRooms
      .filter((r) => (r.facility_name ?? "Other") === name)
      .map((r) => ({ ...r, from: manilaMinutesOf(r.starts_at), to: manilaMinutesOf(r.ends_at) }))
      .sort((a, b) => a.from - b.from),
  }));

  return {
    date,
    slots,
    rooms: roomRows,
    stats: {
      groups: dayTables.length,
      people: dayTables.reduce((n, t) => n + t.group_size, 0),
      roomsBooked: dayRooms.filter((r) => r.status === "approved").length,
      awaiting: dayRooms.filter((r) => r.status === "pending").length,
    },
  };
}

/** Where a block sits on the timeline, as percentages of the day. */
export function blockPosition(from: number, to: number): { left: number; width: number } {
  const span = DAY_END - DAY_START;
  const a = Math.max(DAY_START, Math.min(DAY_END, from));
  const b = Math.max(a, Math.min(DAY_END, to));
  return { left: ((a - DAY_START) / span) * 100, width: ((b - a) / span) * 100 };
}

/** Add days to a "YYYY-MM-DD" key. */
export function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday to Saturday of the week holding `date` (Sunday belongs to the week before). */
export function weekOf(date: string): string[] {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const monday = shiftDay(date, dow === 0 ? -6 : 1 - dow);
  return Array.from({ length: 6 }, (_, i) => shiftDay(monday, i));
}

export const isDateKey = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

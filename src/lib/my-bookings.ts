/**
 * A member's upcoming bookings of every kind as one list, soonest first: the
 * "Your next booking" card on /reserve and My reservations (2026-09-30).
 * Pure, so the rules are testable; queries.ts supplies the rows.
 */
import { DGROUP_SLOTS, roomName, slotLabel, tablesLabel } from "@/lib/dgroup-tables";
import { timeLabel } from "@/lib/ministry-rooms";

export interface TableRow {
  id: string;
  room_slug: string;
  table_labels: string[];
  booked_on: string;
  slot_id: string;
  group_size: number;
}

export interface RoomRow {
  id: string;
  facility_name: string | null;
  court_name: string | null;
  activity_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  participants: number;
}

export interface Upcoming {
  id: string;
  kind: "table" | "room";
  /** Manila "YYYY-MM-DD". */
  date: string;
  /** UTC ms of the start, for ordering. */
  startsAt: number;
  title: string;
  /** "4:00 – 6:30 PM" */
  time: string;
  people: number;
  status: string;
  /** The row it came from, for actions. */
  table?: TableRow;
  room?: RoomRow;
}

const H8 = 8 * 3_600_000;
const manilaKey = (ms: number) => new Date(ms + H8).toISOString().slice(0, 10);
const manilaMinutesOf = (ms: number) => {
  const d = new Date(ms + H8);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export function mergeUpcoming(tables: TableRow[], rooms: RoomRow[], now: Date = new Date()): Upcoming[] {
  const fromTables: Upcoming[] = tables.map((t) => {
    const start = DGROUP_SLOTS.find((s) => s.id === t.slot_id)?.start ?? "13:00";
    return {
      id: t.id,
      kind: "table",
      date: t.booked_on,
      startsAt: new Date(`${t.booked_on}T${start}:00+08:00`).getTime(),
      title: `${tablesLabel(t.table_labels)} · ${roomName(t.room_slug)}`,
      time: slotLabel(t.slot_id),
      people: t.group_size,
      status: "confirmed",
      table: t,
    };
  });
  const fromRooms: Upcoming[] = rooms
    .filter(
      (r) =>
        (r.status === "pending" || r.status === "approved") &&
        new Date(r.ends_at).getTime() > now.getTime(),
    )
    .map((r) => {
      const s = new Date(r.starts_at).getTime();
      const e = new Date(r.ends_at).getTime();
      return {
        id: r.id,
        kind: "room",
        date: manilaKey(s),
        startsAt: s,
        title: r.activity_name ?? r.facility_name ?? "Room booking",
        time: `${timeLabel(manilaMinutesOf(s))} – ${timeLabel(manilaMinutesOf(e))}`,
        people: r.participants,
        status: r.status,
        room: r,
      };
    });
  return [...fromTables, ...fromRooms].sort((a, b) => a.startsAt - b.startsAt);
}

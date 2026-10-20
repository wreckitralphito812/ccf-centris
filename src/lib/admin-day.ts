/**
 * The admin Today board (2026-10-03): one day of bookings, shaped for the
 * facilities team. Dgroup tables by time slot and room (for the floor plans),
 * and room requests as blocks on each room's timeline. Pure, so it's tested
 * without a database; the page passes in rows from queries.ts.
 */
import { DGROUP_ROOMS, DGROUP_SLOTS, type DgroupSlot } from "@/lib/dgroup-tables";
import { MINISTRY_ROOMS } from "@/lib/ministry-rooms";
import { daysCovered, venueRooms } from "@/lib/announcements";

export interface DayTable {
  id: string;
  leader_name: string;
  dgroup_name?: string | null;
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
  /** Matched on, not the name: the database calls the halls "Multipurpose Hall 1" (2026-10-14). */
  facility_slug?: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  /** Where tapping it goes when it isn't a room request: a Gym court rental (2026-10-20). */
  href?: string;
}

/**
 * Every room on the admin boards: the ministry rooms, and the Main Hall
 * (Adrian, 2026-10-16), which ministries don't request but the team books
 * and blocks for services and big events. The Gym joined on the same terms
 * (Adrian, 2026-10-20): it's the room the database calls the Sports Hall.
 * It goes last, so the first ministry room stays the boards' default.
 */
export const BOARD_ROOMS: { slug: string; name: string; dgroupRoom: boolean }[] = [
  { slug: "main-worship-hall", name: "Main Hall", dgroupRoom: false },
  ...MINISTRY_ROOMS.map((r) => ({ slug: r.slug, name: r.name, dgroupRoom: r.dgroupRoom })),
  { slug: "sports-hall", name: "Gym", dgroupRoom: false },
];

/**
 * The room a booking or block is for, by slug. Until 2026-10-14 the
 * boards matched on names, and production names the halls "Multipurpose Hall
 * 1–4" where the site says "John (MPH 1)", so hall bookings never showed.
 */
export function roomFor(r: { facility_slug?: string | null; facility_name?: string | null }) {
  return (
    BOARD_ROOMS.find((m) => (r.facility_slug ? m.slug === r.facility_slug : m.name === r.facility_name)) ??
    (r.facility_name === "Main Worship Hall"
      ? BOARD_ROOMS[0]
      : r.facility_name === "Sports Hall"
        ? BOARD_ROOMS[BOARD_ROOMS.length - 1]
        : null)
  );
}

/** The name the boards show for a booking's room. */
export const roomLabel = (r: { facility_slug?: string | null; facility_name?: string | null }) =>
  roomFor(r)?.name ?? r.facility_name ?? "Other";

/** An event as the boards read it (CcfEvent from getAdminEvents fits). */
export interface BoardEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location_note: string | null;
  status?: string;
  calendar_only?: boolean;
  dates?: { starts_at: string; ends_at: string | null; all_day?: boolean }[];
}

/** One event on one day. `from` is null for all-day dates. */
export interface DayEvent {
  key: string;
  id: string;
  title: string;
  from: number | null;
  to: number | null;
  venue: string | null;
  /** Ministry room slugs the venue names; empty for "CCF Centris", Main Hall or elsewhere. */
  rooms: string[];
  /** Hidden from the site (status "draft"). */
  hidden: boolean;
  calendarOnly: boolean;
}

/**
 * Every event on a day, published, hidden or calendar-only (Ralph,
 * 2026-10-14): the team blocks rooms with events, so the boards must show
 * them all, not just what's on What's Happening.
 */
export function eventsOn(events: BoardEvent[], date: string): DayEvent[] {
  const out: DayEvent[] = [];
  for (const e of events) {
    const rooms = venueRooms(e.location_note)
      .map((name) => BOARD_ROOMS.find((m) => m.name === name)?.slug)
      .filter((s): s is string => Boolean(s));
    const dates = e.dates?.length ? e.dates : [{ starts_at: e.starts_at, ends_at: e.ends_at, all_day: false }];
    dates.forEach((d, i) => {
      if (!daysCovered(d).includes(date)) return;
      out.push({
        key: `${e.id}-${i}-${date}`,
        id: e.id,
        title: e.title,
        from: d.all_day ? null : manilaMinutesOf(d.starts_at),
        to: d.all_day || !d.ends_at ? null : manilaMinutesOf(d.ends_at),
        venue: e.location_note,
        rooms,
        hidden: e.status === "draft",
        calendarOnly: Boolean(e.calendar_only),
      });
    });
  }
  return out.sort((a, b) => (a.from ?? -1) - (b.from ?? -1));
}
/**
 * The room timeline runs from the center's first slot to its last. It starts
 * at 7:00 AM and ends at 10:00 PM since the Gym joined (2026-10-20): sports
 * run 7 AM to 10 PM, wider than the rooms' 9:00 AM to 9:30 PM.
 */
export const DAY_START = 7 * 60;
export const DAY_END = 22 * 60;

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
    slug: string | null;
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
    ...BOARD_ROOMS.map((r) => r.name),
    // Anything booked in a room the list doesn't know still shows.
    ...[...new Set(dayRooms.map(roomLabel))].filter((n) => !BOARD_ROOMS.some((r) => r.name === n)),
  ];
  const roomRows = names.map((name) => ({
    name,
    slug: BOARD_ROOMS.find((r) => r.name === name)?.slug ?? null,
    blocks: dayRooms
      .filter((r) => roomLabel(r) === name)
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

/** Sunday to Saturday of the week holding `date`: the church week (Adrian, 2026-10-16). */
export function weekOf(date: string): string[] {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const sunday = shiftDay(date, -dow);
  return Array.from({ length: 7 }, (_, i) => shiftDay(sunday, i));
}

export const isDateKey = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

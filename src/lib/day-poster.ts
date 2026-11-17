/**
 * The day poster for the TV by the guard's desk (Adrian, 2026-11-15): what's
 * on at Centris that day, room by room (2026-11-17), each room's bookings by
 * start time. Events (shown, hidden or calendar-only) under every room they
 * use, approved room requests, Gym court rentals, and each Dgroup table
 * booking with its group and table numbers. Names and groups only: the
 * poster hangs in a public place, so no phone numbers or emails. Pure, so
 * it's tested without a database; the route reads the rows and draws it.
 */
import { BOARD_ROOMS, eventsOn, manilaDay, manilaMinutesOf, roomFor, type BoardEvent, type DayRoomBooking } from "@/lib/admin-day";
import { venueLabel } from "@/lib/announcements";
import { courtsLabel, sportName } from "@/lib/court-rentals";
import { DGROUP_SLOTS, tablesLabel } from "@/lib/dgroup-tables";
import { timeLabel, toMinutes } from "@/lib/ministry-rooms";

export interface PosterItem {
  key: string;
  /** Manila minutes after midnight; null for all day. */
  from: number | null;
  to: number | null;
  title: string;
  /** Who it's for, or the tables: one short line under the title. */
  detail: string | null;
}

export interface PosterRoom {
  key: string;
  name: string;
  items: PosterItem[];
}

export interface PosterInput {
  date: string;
  events: BoardEvent[];
  rooms: DayRoomBooking[];
  rentals: {
    id: string;
    sport: string;
    booked_on: string;
    start_hour: number;
    hours: number;
    court_numbers: number[];
    renter_name: string;
    dgroup_name?: string | null;
    status: string;
  }[];
  tables: {
    id: string;
    booked_on: string;
    slot_id: string;
    room_slug: string;
    table_labels: string[];
    leader_name: string;
    dgroup_name?: string | null;
    status: string;
  }[];
}

/** The day's bookings, room by room in the boards' order, each room's by start time. */
export function posterRooms({ date, events, rooms, rentals, tables }: PosterInput): PosterRoom[] {
  const byRoom = new Map<string, { name: string; items: PosterItem[] }>();
  const add = (key: string, name: string, item: PosterItem) => {
    if (!byRoom.has(key)) byRoom.set(key, { name, items: [] });
    byRoom.get(key)!.items.push(item);
  };
  const boardName = (slug: string) => BOARD_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

  // Events go under every room they use; one held elsewhere gets its own heading.
  for (const e of eventsOn(events, date)) {
    const item = { key: e.key, from: e.from, to: e.to, title: e.title, detail: null };
    if (e.rooms.length) for (const slug of e.rooms) add(slug, boardName(slug), { ...item, key: `${item.key}-${slug}` });
    else add(`other:${venueLabel(e.venue)}`, venueLabel(e.venue), item);
  }

  // Approved room requests; a request for several rooms shows under each.
  for (const r of rooms) {
    if (r.status !== "approved" || manilaDay(r.starts_at) !== date || r.href) continue;
    const slug = roomFor(r)?.slug;
    const item = {
      key: `room-${r.id}`,
      from: manilaMinutesOf(r.starts_at),
      to: manilaMinutesOf(r.ends_at),
      title: r.activity_name || "Room booking",
      detail: r.organization || r.contact_name,
    };
    if (slug) add(slug, boardName(slug), item);
    else add(`other:${r.facility_name ?? "Room"}`, r.facility_name ?? "Room", item);
  }

  for (const r of rentals) {
    if (r.status !== "confirmed" || r.booked_on !== date) continue;
    add("sports-hall", boardName("sports-hall"), {
      key: `court-${r.id}`,
      from: r.start_hour * 60,
      to: (r.start_hour + r.hours) * 60,
      title: `${sportName(r.sport)} · ${courtsLabel(r.sport, r.court_numbers)}`,
      detail: r.dgroup_name ? `${r.renter_name} (${r.dgroup_name})` : r.renter_name,
    });
  }

  // Each Dgroup table booking: the group (or its leader) and its tables (Adrian, 2026-11-17).
  for (const t of tables) {
    if (t.booked_on !== date || !["pending", "confirmed"].includes(t.status)) continue;
    const slot = DGROUP_SLOTS.find((s) => s.id === t.slot_id);
    if (!slot) continue;
    add(t.room_slug, boardName(t.room_slug), {
      key: `table-${t.id}`,
      from: toMinutes(slot.start),
      to: toMinutes(slot.end),
      title: t.dgroup_name || t.leader_name,
      detail: `Dgroup · ${tablesLabel(t.table_labels)}`,
    });
  }

  const order = (key: string) => {
    const i = BOARD_ROOMS.findIndex((r) => r.slug === key);
    return i < 0 ? BOARD_ROOMS.length : i;
  };
  return [...byRoom.entries()]
    .map(([key, v]) => ({
      key,
      name: v.name,
      items: v.items.sort((a, b) => (a.from ?? -1) - (b.from ?? -1) || a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => order(a.key) - order(b.key) || a.name.localeCompare(b.name));
}

/** "7:00 PM – 9:30 PM", "From 7:00 PM", or "All day". */
export function posterTime(i: Pick<PosterItem, "from" | "to">): string {
  if (i.from === null) return "All day";
  return i.to === null ? `From ${timeLabel(i.from)}` : `${timeLabel(i.from)} – ${timeLabel(i.to)}`;
}

/** Height on the 1920-pixel poster left for the rooms, under the compact heading and above the footer. */
export const POSTER_LIST_HEIGHT = 1560;
const GAP = 8;
const MIN_ROW = 52;
const MAX_ROW = 112;
/** A room's heading, as a share of a row's height. */
const HEADING = 0.62;

export interface PosterLayout {
  row: number;
  heading: number;
  gap: number;
  title: number;
  detail: number;
  time: number;
  /** The rooms as they fit, with how many lines were left out. */
  rooms: PosterRoom[];
  more: number;
}

/**
 * Row height and text sizes that fit the day's rooms on one poster. A quiet
 * day gets roomy rows; a busy one shrinks them, down to MIN_ROW, after which
 * the last rooms are cut short and the poster says how many more there are.
 */
export function posterLayout(rooms: PosterRoom[]): PosterLayout {
  const lines = rooms.reduce((n, r) => n + r.items.length, 0);
  const space = (row: number, items: number, heads: number) =>
    items * (row + GAP) + heads * (Math.round(row * HEADING) + GAP);
  let row = rooms.length ? Math.floor((POSTER_LIST_HEIGHT + 0) / (lines + rooms.length * HEADING) - GAP) : MAX_ROW;
  row = Math.max(MIN_ROW, Math.min(MAX_ROW, row));
  while (row > MIN_ROW && space(row, lines, rooms.length) > POSTER_LIST_HEIGHT) row--;

  // Still too much at the smallest size: keep what fits, leaving a line for "And N more".
  let fitted = rooms;
  let more = 0;
  if (space(row, lines, rooms.length) > POSTER_LIST_HEIGHT) {
    const budget = POSTER_LIST_HEIGHT - (row + GAP);
    let used = 0;
    fitted = [];
    for (const r of rooms) {
      const head = Math.round(row * HEADING) + GAP;
      const room = Math.floor((budget - used - head) / (row + GAP));
      if (room <= 0) break;
      const items = r.items.slice(0, room);
      fitted.push({ ...r, items });
      used += head + items.length * (row + GAP);
      if (items.length < r.items.length) break;
    }
    more = lines - fitted.reduce((n, r) => n + r.items.length, 0);
  }

  return {
    row,
    heading: Math.round(row * HEADING),
    gap: GAP,
    title: Math.round(Math.min(40, row * 0.36)),
    detail: Math.round(Math.min(27, row * 0.25)),
    time: Math.round(Math.min(30, row * 0.27)),
    rooms: fitted,
    more,
  };
}

/** Average letter width as a share of the font size, for the poster's bold sans-serif. Measured, with a little to spare. */
const LETTER = 0.56;

/**
 * One line of poster text that fits `width` pixels without wrapping
 * (Adrian, 2026-11-15: long titles spilled onto a second line). A long line
 * gets a smaller font, down to `min`; past that it's shortened with "…".
 */
export function fitLine(text: string, size: number, width: number, min: number): { size: number; text: string } {
  const fits = Math.floor(Math.min(size, width / (Math.max(text.length, 1) * LETTER)));
  if (fits >= min) return { size: fits, text };
  const n = Math.max(4, Math.floor(width / (min * LETTER)));
  return { size: min, text: text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text };
}

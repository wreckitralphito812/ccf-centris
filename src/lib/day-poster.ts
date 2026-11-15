/**
 * The day poster for the TV by the guard's desk (Adrian, 2026-11-15): one
 * line for everything on at Centris that day, soonest first. Events (shown,
 * hidden or calendar-only), approved room requests, Gym court rentals and the
 * Dgroup tables, per room and slot. Names and groups only: the poster hangs
 * in a public place, so no phone numbers or emails. Pure, so it's tested
 * without a database; the route reads the rows and draws the picture.
 */
import { eventsOn, manilaDay, manilaMinutesOf, roomLabel, type BoardEvent, type DayRoomBooking } from "@/lib/admin-day";
import { venueLabel } from "@/lib/announcements";
import { courtsLabel, sportName } from "@/lib/court-rentals";
import { DGROUP_SLOTS, roomName } from "@/lib/dgroup-tables";
import { timeLabel, toMinutes } from "@/lib/ministry-rooms";

export interface PosterItem {
  key: string;
  /** Manila minutes after midnight; null for all day. */
  from: number | null;
  to: number | null;
  title: string;
  where: string;
  who: string | null;
}

export interface PosterInput {
  date: string;
  events: BoardEvent[];
  rooms: (DayRoomBooking & { request_group?: string | null })[];
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
  tables: { id: string; booked_on: string; slot_id: string; room_slug: string; status: string }[];
}

export function posterItems({ date, events, rooms, rentals, tables }: PosterInput): PosterItem[] {
  const items: PosterItem[] = [];

  for (const e of eventsOn(events, date)) {
    items.push({ key: e.key, from: e.from, to: e.to, title: e.title, where: venueLabel(e.venue), who: null });
  }

  // Approved room requests; a request for several rooms is one line.
  const groups = new Map<string, DayRoomBooking[]>();
  for (const r of rooms) {
    if (r.status !== "approved" || manilaDay(r.starts_at) !== date || r.href) continue;
    const k = r.request_group ?? r.id;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const [k, rs] of groups) {
    const r = rs[0];
    items.push({
      key: `room-${k}`,
      from: manilaMinutesOf(r.starts_at),
      to: manilaMinutesOf(r.ends_at),
      title: r.activity_name || "Room booking",
      where: [...new Set(rs.map(roomLabel))].join(", "),
      who: r.organization || r.contact_name,
    });
  }

  for (const r of rentals) {
    if (r.status !== "confirmed" || r.booked_on !== date) continue;
    items.push({
      key: `court-${r.id}`,
      from: r.start_hour * 60,
      to: (r.start_hour + r.hours) * 60,
      title: `${sportName(r.sport)} · ${courtsLabel(r.sport, r.court_numbers)}`,
      where: "Gym",
      who: r.dgroup_name ? `${r.renter_name} (${r.dgroup_name})` : r.renter_name,
    });
  }

  // Dgroup tables: one line per room and slot, with how many groups.
  const count = new Map<string, number>();
  for (const t of tables) {
    if (t.booked_on !== date || !["pending", "confirmed"].includes(t.status)) continue;
    count.set(`${t.slot_id}|${t.room_slug}`, (count.get(`${t.slot_id}|${t.room_slug}`) ?? 0) + 1);
  }
  for (const [k, n] of count) {
    const [slotId, room] = k.split("|");
    const slot = DGROUP_SLOTS.find((s) => s.id === slotId);
    if (!slot) continue;
    items.push({
      key: `tables-${k}`,
      from: toMinutes(slot.start),
      to: toMinutes(slot.end),
      title: "Dgroup tables",
      where: roomName(room),
      who: `${n} ${n === 1 ? "Dgroup" : "Dgroups"}`,
    });
  }

  return items.sort((a, b) => (a.from ?? -1) - (b.from ?? -1) || a.title.localeCompare(b.title));
}

/** "7:00 PM – 9:30 PM", "From 7:00 PM", or "All day". */
export function posterTime(i: Pick<PosterItem, "from" | "to">): string {
  if (i.from === null) return "All day";
  return i.to === null ? `From ${timeLabel(i.from)}` : `${timeLabel(i.from)} – ${timeLabel(i.to)}`;
}

/** The time as two lines for the poster's time column: "7:00 PM" over "to 9:30 PM". */
export function posterTimeLines(i: Pick<PosterItem, "from" | "to">): [string, string] {
  if (i.from === null) return ["All day", ""];
  return [timeLabel(i.from), i.to === null ? "onwards" : `to ${timeLabel(i.to)}`];
}

/** Height on the 1920-pixel poster left for the list, under the heading and above the footer. */
export const POSTER_LIST_HEIGHT = 1290;
const GAP = 12;
const MIN_ROW = 72;
const MAX_ROW = 160;

/**
 * Row height and text sizes that fit `n` lines on one poster. A quiet day gets
 * big, roomy rows; a busy one shrinks them, down to MIN_ROW, after which the
 * last line says how many more there are.
 */
export function posterScale(n: number): { row: number; gap: number; title: number; sub: number; time: number; max: number } {
  const max = Math.floor((POSTER_LIST_HEIGHT + GAP) / (MIN_ROW + GAP));
  const k = Math.max(1, Math.min(n, max));
  const row = Math.floor(Math.min(MAX_ROW, (POSTER_LIST_HEIGHT - GAP * (k - 1)) / k));
  return {
    row,
    gap: GAP,
    title: Math.round(Math.min(44, row * 0.3)),
    sub: Math.round(Math.min(30, row * 0.21)),
    time: Math.round(Math.min(34, row * 0.25)),
    max,
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

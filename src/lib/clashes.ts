/**
 * Clashes on the admin schedule (Adrian, 2026-11-16): two things in the same
 * room at overlapping times. Events (shown, hidden or calendar-only) can be
 * put anywhere, so they can land on each other or on a room request; the
 * room requests themselves can't overlap (the database refuses that). Court
 * rentals sharing the Gym aren't a clash, since the Gym has three courts.
 * Pure, so it's tested without a database; Today, This week and the Room
 * calendar list what this finds.
 */
import { BOARD_ROOMS, eventsOn, manilaDay, manilaMinutesOf, roomFor, type BoardEvent, type DayRoomBooking } from "@/lib/admin-day";

export interface ClashSide {
  title: string;
  href: string;
  kind: "event" | "request" | "rental";
  /** A room request still waiting for approval. */
  pending?: boolean;
}

export interface Clash {
  date: string;
  room: string;
  roomName: string;
  /** Where the two overlap, in Manila minutes. */
  from: number;
  to: number;
  a: ClashSide;
  b: ClashSide;
}

interface Slot extends ClashSide {
  key: string;
  room: string;
  from: number;
  to: number;
}

/** Every clash on one day, by room, soonest first. */
export function clashesOn(date: string, events: BoardEvent[], bookings: DayRoomBooking[]): Clash[] {
  const slots: Slot[] = [];
  for (const e of eventsOn(events, date)) {
    const from = e.from ?? 0;
    const to = e.from === null ? 24 * 60 : (e.to ?? e.from + 60);
    for (const room of e.rooms) {
      slots.push({ key: `e-${e.id}`, room, from, to, title: e.title, href: `/admin/events/${e.id}`, kind: "event" });
    }
  }
  for (const b of bookings) {
    if (!["pending", "approved"].includes(b.status) || manilaDay(b.starts_at) !== date) continue;
    const room = roomFor(b)?.slug;
    if (!room) continue;
    slots.push({
      key: `b-${b.id}`,
      room,
      from: manilaMinutesOf(b.starts_at),
      to: manilaMinutesOf(b.ends_at),
      title: b.activity_name || "Room booking",
      href: b.href ?? `/admin/reservations/${b.id}`,
      kind: b.href ? "rental" : "request",
      pending: b.status === "pending",
    });
  }

  const out: Clash[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const [a, b] = [slots[i], slots[j]];
      if (a.room !== b.room || a.key === b.key) continue;
      if (a.kind === "rental" && b.kind === "rental") continue;
      if (!(a.from < b.to && b.from < a.to)) continue;
      const id = `${a.room}|${[a.key, b.key].sort().join("|")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const [first, second] = a.from <= b.from ? [a, b] : [b, a];
      out.push({
        date,
        room: a.room,
        roomName: BOARD_ROOMS.find((r) => r.slug === a.room)?.name ?? a.room,
        from: Math.max(a.from, b.from),
        to: Math.min(a.to, b.to),
        a: { title: first.title, href: first.href, kind: first.kind, pending: first.pending },
        b: { title: second.title, href: second.href, kind: second.kind, pending: second.pending },
      });
    }
  }
  return out.sort((x, y) => x.from - y.from || x.roomName.localeCompare(y.roomName));
}

/** Every clash across several days. */
export const clashesIn = (dates: string[], events: BoardEvent[], bookings: DayRoomBooking[]) =>
  dates.flatMap((d) => clashesOn(d, events, bookings));

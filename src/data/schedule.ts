import type { Service } from "@/lib/types";
import { messages, series, speakers } from "./teaching";
import { venues } from "./center";

/**
 * Services are generated relative to the current date rather than pinned, so
 * the homepage's before / during / after states are always demonstrable.
 * Sunday 9:00 and 11:30, plus a Saturday 17:00 gathering.
 *
 * Times below are representative. Confirmed CCF Centris service times will be
 * set through the admin.
 */

const MANILA_OFFSET_MIN = 8 * 60;

/** Build a UTC instant from a Manila wall-clock date and time. */
function manila(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, m, d, hh, mm) - MANILA_OFFSET_MIN * 60_000);
}

/** The Manila-local calendar date for an instant. */
function manilaParts(at: Date) {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_MIN * 60_000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    dow: shifted.getUTCDay(),
  };
}

interface Slot {
  dow: number;
  hour: number;
  minute: number;
  durationMin: number;
  title: string;
  venueId: string;
}

const SLOTS: Slot[] = [
  { dow: 6, hour: 17, minute: 0, durationMin: 90, title: "Saturday Worship", venueId: "ven-1" },
  { dow: 0, hour: 9, minute: 0, durationMin: 90, title: "Sunday Worship", venueId: "ven-1" },
  { dow: 0, hour: 11, minute: 30, durationMin: 90, title: "Sunday Worship", venueId: "ven-1" },
];

const venueById = Object.fromEntries(venues.map((v) => [v.id, v]));

/**
 * Every service in a window around now, newest first.
 * Weeks back and forward are generous so archive and calendar both fill.
 */
export function buildServices(now: Date = new Date()): Service[] {
  const out: Service[] = [];
  const { y, m, d } = manilaParts(now);
  const anchor = Date.UTC(y, m, d);

  for (let week = -8; week <= 8; week++) {
    for (const slot of SLOTS) {
      const dayCursor = new Date(anchor + week * 7 * 86_400_000);
      const cursorDow = dayCursor.getUTCDay();
      const delta = slot.dow - cursorDow;
      const target = new Date(dayCursor.getTime() + delta * 86_400_000);

      const starts = manila(
        target.getUTCFullYear(),
        target.getUTCMonth(),
        target.getUTCDate(),
        slot.hour,
        slot.minute,
      );
      const ends = new Date(starts.getTime() + slot.durationMin * 60_000);

      // Pair the service with whichever message is closest behind it, so the
      // archive and the service list tell a consistent story.
      const past = messages.filter(
        (msg) => new Date(`${msg.preached_on}T00:00:00Z`).getTime() <= starts.getTime(),
      );
      const paired = past[0] ?? messages[0];

      const status: Service["status"] =
        now >= starts && now < ends
          ? "live"
          : now >= ends
            ? "ended"
            : "scheduled";

      out.push({
        id: `svc-${starts.toISOString()}`,
        title: slot.title,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status,
        venue: venueById[slot.venueId] ?? null,
        series: paired?.series ?? series[0],
        speaker: paired?.speaker ?? speakers[0],
        livestream_key: "ccf-centris-live",
        nxtgen_available: true,
        notes: null,
      });
    }
  }

  return out
    .filter(
      (s, i, arr) => arr.findIndex((o) => o.starts_at === s.starts_at) === i,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

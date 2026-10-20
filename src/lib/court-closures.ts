/**
 * The Gym's closed hours for court rentals (2026-10-20): a room block on the
 * Gym, or an event the team has put in it, closes every court for the hours
 * it touches. Kept apart from court-rentals.ts so the booking form doesn't
 * carry the admin boards' code. Pure, so it's tested without a database.
 */
import { eventsOn, type BoardEvent } from "@/lib/admin-day";
import type { CourtHold } from "@/lib/court-rentals";

const GYM = "sports-hall";
const H = 3_600_000;
const hourStart = (date: string, hour: number) => new Date(`${date}T00:00:00+08:00`).getTime() + hour * H;

export function gymClosures(
  blocks: { starts_at: string; ends_at: string; facility_slug?: string | null }[],
  events: BoardEvent[],
  dates: string[],
): CourtHold[] {
  const out: CourtHold[] = [];
  const close = (date: string, hour: number) => out.push({ date, hour, court: 0 });
  const gymBlocks = blocks.filter((b) => b.facility_slug === GYM);
  for (const date of dates) {
    for (const b of gymBlocks) {
      const from = new Date(b.starts_at).getTime();
      const to = new Date(b.ends_at).getTime();
      for (let h = 0; h < 24; h++) if (from < hourStart(date, h + 1) && to > hourStart(date, h)) close(date, h);
    }
    for (const e of eventsOn(events, date)) {
      if (!e.rooms.includes(GYM)) continue;
      // All day, or from its start to its end (an hour when no end is given).
      const from = e.from ?? 0;
      const to = e.from === null ? 24 * 60 : (e.to ?? e.from + 60);
      for (let h = 0; h < 24; h++) if (from < (h + 1) * 60 && to > h * 60) close(date, h);
    }
  }
  return out;
}

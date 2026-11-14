/**
 * Closing rooms and Dgroup tables over a stretch of time (Adrian,
 * 2026-11-14): several rooms and tables at once, from one day and time until
 * another. The stretch is saved one day at a time, because Today, This week,
 * the Room calendar and the booking forms all read a closure as one day's
 * block. Each day is clipped to the center's hours (7:00 AM to 10:00 PM, the
 * boards' timeline), when anything can be booked. Pure, so it's tested
 * without a database.
 */
import { DAY_END, DAY_START } from "@/lib/admin-day";
import { DGROUP_NIGHTS, DGROUP_ROOMS, DGROUP_SLOTS } from "@/lib/dgroup-tables";
import { toMinutes } from "@/lib/ministry-rooms";

/** Long enough for a retreat week or a month of repairs, short enough to catch a typo in the year. */
export const MAX_CLOSE_DAYS = 62;

export interface DaySpan {
  date: string;
  /** Manila minutes after midnight. */
  from: number;
  to: number;
}

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * The days a closure covers, each with its hours: the first from the start
 * time, the last until the end time, any between all day. Null with a reason
 * when the stretch doesn't make sense.
 */
export function closeDays(
  fromDate: string,
  fromTime: string,
  toDate: string,
  toTime: string,
): { ok: true; days: DaySpan[] } | { ok: false; error: string } {
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const isTime = (v: string) => /^\d{2}:\d{2}$/.test(v);
  if (!isDate(fromDate) || !isDate(toDate)) return { ok: false, error: "Choose the first and last day." };
  if (!isTime(fromTime) || !isTime(toTime)) return { ok: false, error: "Choose a start and end time." };
  const start = toMinutes(fromTime);
  const end = toMinutes(toTime);
  if (toDate < fromDate || (toDate === fromDate && end <= start)) {
    return { ok: false, error: "The end has to come after the start." };
  }
  const days: DaySpan[] = [];
  for (let d = fromDate, i = 0; d <= toDate; d = addDays(d, 1), i++) {
    if (i >= MAX_CLOSE_DAYS) return { ok: false, error: `Close up to ${MAX_CLOSE_DAYS} days at a time.` };
    const from = Math.max(DAY_START, d === fromDate ? start : DAY_START);
    const to = Math.min(DAY_END, d === toDate ? end : DAY_END);
    if (to > from) days.push({ date: d, from, to });
  }
  if (!days.length) return { ok: false, error: "That time is outside the center's hours (7:00 AM to 10:00 PM)." };
  return { ok: true, days };
}

/** Manila minutes on a date as an ISO instant. */
export const manilaInstant = (date: string, minutes: number) =>
  new Date(new Date(`${date}T00:00:00+08:00`).getTime() + minutes * 60_000).toISOString();

/** A pick of Dgroup tables: one room, and either some tables or all of them (null). */
export interface TablePick {
  room: string;
  labels: string[] | null;
}

/**
 * Read the form's table ticks: "welcome-center:*" for a whole room, or
 * "welcome-center:7" for one table. A whole room wins over its single tables.
 */
export function parseTablePicks(values: string[]): TablePick[] {
  const out: TablePick[] = [];
  for (const room of DGROUP_ROOMS) {
    const mine = values.filter((v) => v.startsWith(`${room.slug}:`)).map((v) => v.slice(room.slug.length + 1));
    if (!mine.length) continue;
    if (mine.includes("*")) {
      out.push({ room: room.slug, labels: null });
      continue;
    }
    const labels = room.tables.map((t) => t.label).filter((l) => mine.includes(l));
    if (labels.length) out.push({ room: room.slug, labels: labels.length === room.tables.length ? null : labels });
  }
  return out;
}

export interface TableBlockRow {
  room_slug: string;
  table_label: string | null;
  booked_on: string;
  slot_id: string | null;
}

/**
 * The table blocks for a closure: on Dgroup nights only, for each time slot
 * the day's hours touch (the whole day when they touch all three).
 */
export function tableBlockRows(days: DaySpan[], picks: TablePick[]): TableBlockRow[] {
  const rows: TableBlockRow[] = [];
  for (const day of days) {
    if (!DGROUP_NIGHTS.includes(new Date(`${day.date}T00:00:00Z`).getUTCDay())) continue;
    const slots = DGROUP_SLOTS.filter((s) => toMinutes(s.start) < day.to && toMinutes(s.end) > day.from);
    if (!slots.length) continue;
    const slotIds = slots.length === DGROUP_SLOTS.length ? [null] : slots.map((s) => s.id);
    for (const pick of picks) {
      for (const label of pick.labels ?? [null]) {
        for (const slot_id of slotIds) rows.push({ room_slug: pick.room, table_label: label, booked_on: day.date, slot_id });
      }
    }
  }
  return rows;
}

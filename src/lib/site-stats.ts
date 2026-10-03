/**
 * The admin Analytics page's numbers (2026-10-03), computed from the
 * database instead of the template's invented figures. Operational only:
 * how many people have accounts, how the tables and rooms are used, how the
 * Prayer Wall is doing. Nothing here is per person. Visits come from Vercel
 * Web Analytics, which the page links to. Pure, so it's tested without a
 * database.
 */
import { DGROUP_SLOTS, WEEKDAY_NAMES } from "@/lib/dgroup-tables";
import { manilaDay } from "@/lib/admin-day";

export interface StatsInput {
  /** Manila "YYYY-MM-DD" today. */
  today: string;
  now: Date;
  members: { total: number; joined30: number };
  tables: { status: string; booked_on: string; slot_id: string; room_slug: string; group_size: number; created_at: string }[];
  rooms: { status: string; created_at: string; starts_at: string; facility_name: string | null; request_group: string | null; id: string }[];
  posts: { created_at: string; expires_at: string; hidden_at: string | null; answered_at: string | null }[];
  prayers: number;
}

const DAY = 86_400_000;
/** "4:00 – 6:30 PM" → "4:00 PM". */
const startOf = (label: string) => (label.includes(" – ") ? `${label.split(" – ")[0]} ${label.slice(-2)}` : label);
const LIVE_TABLE = ["pending", "confirmed"];

/** Most common key, or null when there's nothing to count. */
function top<T>(items: T[], key: (t: T) => string): { key: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(key(it), (counts.get(key(it)) ?? 0) + 1);
  let best: { key: string; count: number } | null = null;
  for (const [k, c] of counts) if (!best || c > best.count) best = { key: k, count: c };
  return best;
}

export function buildSiteStats(d: StatsInput) {
  const since = (days: number) => d.now.getTime() - days * DAY;
  const after = (iso: string, days: number) => new Date(iso).getTime() >= since(days);
  const dayKey = (days: number) => manilaDay(new Date(since(days)).toISOString());

  // Dgroup tables.
  const live = d.tables.filter((t) => LIVE_TABLE.includes(t.status));
  const recent = live.filter((t) => t.booked_on >= dayKey(90) && t.booked_on <= d.today);
  const made90 = d.tables.filter((t) => after(t.created_at, 90));
  const busySlot = top(recent, (t) => t.slot_id);
  const busyDay = top(recent, (t) => String(new Date(`${t.booked_on}T00:00:00Z`).getUTCDay()));
  const tables = {
    upcoming: live.filter((t) => t.booked_on >= d.today).length,
    booked30: d.tables.filter((t) => after(t.created_at, 30)).length,
    people30: live
      .filter((t) => t.booked_on >= dayKey(30) && t.booked_on <= d.today)
      .reduce((n, t) => n + t.group_size, 0),
    cancelRate: made90.length
      ? Math.round((made90.filter((t) => t.status === "cancelled").length / made90.length) * 100)
      : null,
    // "4:00 PM", the slot's start: short enough for a stat box.
    busiestSlot: busySlot ? startOf(DGROUP_SLOTS.find((s) => s.id === busySlot.key)?.label ?? busySlot.key) : null,
    busiestDay: busyDay ? WEEKDAY_NAMES[Number(busyDay.key)] : null,
    lounge: recent.filter((t) => t.room_slug === "dgroup-lounge").length,
    welcome: recent.filter((t) => t.room_slug === "welcome-center").length,
  };

  // Room requests: one request can ask for several rooms (request_group).
  const requests = new Map<string, StatsInput["rooms"]>();
  for (const r of d.rooms) {
    const k = r.request_group ?? r.id;
    requests.set(k, [...(requests.get(k) ?? []), r]);
  }
  const groups = [...requests.values()].map((rows) => rows[0]);
  const topRoom = top(
    d.rooms.filter((r) => after(r.created_at, 90)),
    (r) => r.facility_name ?? "Other",
  );
  const rooms = {
    requests30: groups.filter((g) => after(g.created_at, 30)).length,
    awaiting: groups.filter((g) => g.status === "pending").length,
    approvedAhead: groups.filter((g) => g.status === "approved" && new Date(g.starts_at).getTime() >= d.now.getTime()).length,
    topRoom: topRoom?.key ?? null,
  };

  // Prayer Wall.
  const open = d.posts.filter((p) => !p.hidden_at && new Date(p.expires_at).getTime() > d.now.getTime());
  const prayer = {
    open: open.length,
    posted30: d.posts.filter((p) => after(p.created_at, 30)).length,
    answered: d.posts.filter((p) => p.answered_at).length,
    prayers: d.prayers,
  };

  return { members: d.members, tables, rooms, prayer };
}

export type SiteStats = ReturnType<typeof buildSiteStats>;

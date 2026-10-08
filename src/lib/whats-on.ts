import { daysCovered } from "@/lib/announcements";
import { fmtTime, manilaDateKey } from "@/lib/format";
import type { CcfEvent } from "@/lib/types";

/**
 * What's on at Centris, for the homepage (2026-10-08): the next seven days
 * at a glance, and the one event worth a banner. Kept apart from the page so
 * the rules can be tested.
 */

export interface AgendaItem {
  /** Manila "3:30 PM", or null for an all-day date. */
  time: string | null;
  title: string;
  /** Calendar-only bookings have no page. */
  href: string | null;
  kind: "service" | "event" | "booked";
  /** For ordering within the day. */
  sortAt: string;
}

export interface AgendaDay {
  /** Manila "YYYY-MM-DD". */
  key: string;
  items: AgendaItem[];
}

type DateLike = { starts_at: string; ends_at: string | null; all_day?: boolean };
const datesOf = (e: CcfEvent): DateLike[] => (e.dates?.length ? e.dates : [{ starts_at: e.starts_at, ends_at: e.ends_at }]);

const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * The days from `today` through the next `days - 1`, with what's on each:
 * Sunday services, events (every day an all-day date covers) and bookings
 * by other satellites. Empty days are left out unless `includeEmpty`.
 */
export function weekAgenda(opts: {
  events: CcfEvent[];
  services: { starts_at: string; title: string | null }[];
  today?: string;
  days?: number;
  includeEmpty?: boolean;
}): AgendaDay[] {
  const today = opts.today ?? manilaDateKey();
  const last = addDays(today, (opts.days ?? 7) - 1);
  const byDay = new Map<string, AgendaItem[]>();
  const add = (k: string, item: AgendaItem) => {
    if (k < today || k > last) return;
    byDay.set(k, [...(byDay.get(k) ?? []), item]);
  };

  for (const s of opts.services) {
    add(manilaDateKey(new Date(s.starts_at)), { time: fmtTime(s.starts_at), title: s.title ?? "Sunday Service", href: "/visit", kind: "service", sortAt: s.starts_at });
  }
  for (const e of opts.events) {
    for (const d of datesOf(e)) {
      for (const k of daysCovered(d)) {
        add(k, {
          time: d.all_day ? null : fmtTime(d.starts_at),
          title: e.title,
          href: e.calendar_only ? null : `/events/${e.slug}`,
          kind: e.calendar_only ? "booked" : "event",
          // All-day items lead the day.
          sortAt: d.all_day ? `${k}T00:00:00Z` : d.starts_at,
        });
      }
    }
  }

  const keys = opts.includeEmpty
    ? Array.from({ length: opts.days ?? 7 }, (_, i) => addDays(today, i))
    : [...byDay.keys()].sort();
  return keys.map((key) => ({
    key,
    items: (byDay.get(key) ?? []).sort((a, b) => a.sortAt.localeCompare(b.sortAt) || a.title.localeCompare(b.title)),
  }));
}

export interface Featured {
  event: CcfEvent;
  /** The date shown: the one happening now, or the next one. */
  next: DateLike;
  happeningNow: boolean;
}

/**
 * The event for the homepage banner: a promoted event with a poster that is
 * happening now or starts within `withinDays`, soonest first. Null when
 * nothing qualifies, so the banner simply doesn't show.
 */
export function featuredEvent(events: CcfEvent[], now: Date = new Date(), withinDays = 14): Featured | null {
  const nowIso = now.toISOString();
  const horizon = new Date(now.getTime() + withinDays * 86_400_000).toISOString();
  let best: Featured | null = null;
  for (const e of events) {
    if (e.calendar_only || !e.cover_image_url || (e.status && e.status !== "published")) continue;
    const next = datesOf(e).find((d) => (d.ends_at ?? d.starts_at) >= nowIso);
    if (!next || next.starts_at > horizon) continue;
    if (!best || next.starts_at < best.next.starts_at) best = { event: e, next, happeningNow: next.starts_at <= nowIso };
  }
  return best;
}

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getFourWsWeeks, getUpcomingEvents } from "@/lib/queries";

/**
 * The public pages worth finding from a search engine. Parked demo pages (see
 * next.config.ts), sign-in, account pages and the admin are left out.
 */
const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/visit", priority: 0.9 },
  { path: "/watch", priority: 0.8 },
  { path: "/watch/4ws", priority: 0.6 },
  { path: "/watch/archive", priority: 0.5 },
  { path: "/connect", priority: 0.7 },
  { path: "/grow/join-a-dgroup", priority: 0.7 },
  { path: "/prayer-wall", priority: 0.6 },
  { path: "/events", priority: 0.6 },
  { path: "/reserve", priority: 0.6 },
  { path: "/reserve/dgroup", priority: 0.6 },
  { path: "/reserve/courts", priority: 0.6 },
  { path: "/give", priority: 0.6 },
  { path: "/contact", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
  { path: "/accessibility", priority: 0.2 },
];

/** Events come and go, so the list is rebuilt hourly rather than at deploy. */
export const revalidate = 3600;

/**
 * The fixed pages, plus every upcoming event and every 4Ws guide (2026-11-14).
 * Those two were only reachable by following links, and the live sitemap
 * listed 18 of about 80 indexable pages. Both lookups fail soft to an empty
 * list, so a database hiccup still returns the fixed pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [events, weeks] = await Promise.all([
    getUpcomingEvents().catch(() => []),
    getFourWsWeeks().catch(() => []),
  ]);
  return [
    ...PAGES.map(({ path, priority }) => ({
      url: `${base}${path === "/" ? "" : path}`,
      priority,
    })),
    ...events.map((e) => ({ url: `${base}/events/${e.slug}`, priority: 0.5 })),
    ...weeks
      .filter((w) => w.hasGuide)
      .map((w) => ({ url: `${base}/watch/4ws/${w.slug}`, priority: 0.4 })),
  ];
}

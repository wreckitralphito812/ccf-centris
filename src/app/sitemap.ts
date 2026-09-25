import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * The public pages worth finding from a search engine. Parked demo pages (see
 * next.config.ts), sign-in, account pages and the admin are left out.
 */
const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/visit", priority: 0.9 },
  { path: "/visit/new-here", priority: 0.8 },
  { path: "/watch", priority: 0.8 },
  { path: "/watch/4ws", priority: 0.6 },
  { path: "/watch/archive", priority: 0.5 },
  { path: "/connect", priority: 0.7 },
  { path: "/grow/join-a-dgroup", priority: 0.7 },
  { path: "/prayer-wall", priority: 0.6 },
  { path: "/events", priority: 0.6 },
  { path: "/reserve", priority: 0.6 },
  { path: "/reserve/dgroup", priority: 0.6 },
  { path: "/contact", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
  { path: "/accessibility", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  return PAGES.map(({ path, priority }) => ({
    url: `${base}${path === "/" ? "" : path}`,
    priority,
  }));
}

import "server-only";

import {
  getLiveBroadcast,
  getUpcomingBroadcasts,
  hqThumb,
  maxResThumb,
  searchChannel,
  type LiveBroadcast,
} from "./youtube-api";
import { getChannelVideos } from "./youtube";
import { getTeaching } from "./teaching-live";
import { SITE } from "./site";

/**
 * The Sunday-service seam.
 *
 * CCF schedules its Sunday livestreams weeks ahead on @CCFmainTV, and titles
 * every one — past and future alike — as:
 *
 *   "Worship with us live! | Sunday Service (September 13, 2026)"
 *
 * So one search over that phrase returns the whole set, and the date in the
 * title says which are done and which are still to come. This module splits
 * that into what the site shows:
 *
 *   - `live`     the stream running right now, if any
 *   - `next`     the single soonest Sunday service still ahead (highlighted)
 *   - `upcoming` the rest of the future queue, for a "future Sundays" list
 *   - `archive`  past services, newest first, each embeddable by the same id
 *
 * The scheduled stream does not survive the service, though: CCF publishes the
 * message as its own upload and the finished stream stops matching the search.
 * So `archive` comes from the sermon catalogue in lib/teaching-live.ts, which
 * is the same service under its real title and preacher.
 *
 * Fails soft: no API key or an unreachable channel falls back to the public
 * RSS feed for the archive and a computed next-Sunday date for `next`.
 */

const SERVICE_QUERY = "Worship with us live Sunday Service";
const SERVICE_TITLE = /worship with us live|sunday service/i;
/** Grace period after 9:00 AM before a service is treated as past. */
const AIRED_GRACE_MS = 3 * 60 * 60 * 1000;

export interface UpcomingService {
  /** Present once CCF has created the stream. Absent for a computed date. */
  videoId: string | null;
  title: string;
  scheduledFor: string; // ISO
  thumbnail: string | null;
  thumbnailFallback: string | null;
  /** Where "set a reminder" should point. */
  watchUrl: string | null;
}

export interface ArchivedService {
  videoId: string;
  title: string;
  description: string;
  /** The service date, from the title. */
  servedOn: string; // ISO
  thumbnail: string;
  thumbnailFallback: string;
  watchUrl: string;
  embedUrl: string;
}

export interface SundayServices {
  live: LiveBroadcast | null;
  next: UpcomingService | null;
  upcoming: UpcomingService[];
  archive: ArchivedService[];
  /** True when the data came from the API rather than the RSS/computed fallback. */
  fromApi: boolean;
}

/* --- Title parsing --------------------------------------------------------- */

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * The service date from a title like
 * "... | Sunday Service (September 13, 2026)", as a Date pinned to 09:00
 * Asia/Manila. Returns null if there is no parseable "(Month Day, Year)".
 */
export function serviceDateFromTitle(title: string): Date | null {
  const m = title.match(
    /\(([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\)/,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);

  // Reject a day that does not exist in that month. Without this, "February
  // 31" quietly rolls over to March 3 (a real-looking but wrong service date),
  // and "September 32" yields an Invalid Date — which still passes an
  // `instanceof Date` guard and then throws from .toISOString().
  const probe = new Date(Date.UTC(year, month, day));
  if (probe.getUTCMonth() !== month || probe.getUTCDate() !== day) return null;

  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  // 09:00 Asia/Manila = 01:00 UTC.
  const parsed = new Date(`${year}-${mm}-${dd}T09:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* --- Fallback: compute the next Sunday ----------------------------------- */

/**
 * The next Sunday 09:00 in Manila, on or after `from`. Used only when the API
 * gives us nothing, so the site can still say when the next service is.
 */
export function nextSundayNineAm(from = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(from);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );
  const hour = Number(get("hour"));

  let addDays = (7 - dow) % 7;
  if (addDays === 0 && hour >= 11) addDays = 7;

  const midnight = new Date(
    `${get("year")}-${get("month")}-${get("day")}T00:00:00+08:00`,
  );
  midnight.setDate(midnight.getDate() + addDays);
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(midnight);
  return new Date(`${dayKey}T09:00:00+08:00`);
}

/* --- Main ---------------------------------------------------------------- */

/**
 * @param opts.checkLive  Whether to poll the 60s-cached live endpoint. Only
 *   /watch/live needs real-time liveness; other callers pass false so the
 *   route isn't pinned to a 60-second revalidate.
 */
export async function getSundayServices(
  opts: { checkLive?: boolean } = {},
): Promise<SundayServices> {
  const { checkLive = false } = opts;

  const [live, streams, scheduled] = await Promise.all([
    checkLive ? getLiveBroadcast() : Promise.resolve(null),
    searchChannel(SERVICE_QUERY, 45),
    // The @CCFmainTV "Streams" tab, ordered by date — real scheduledStartTime,
    // no reliance on parsing a date out of the title.
    getUpcomingBroadcasts(6),
  ]);

  // Keep only the Sunday-service livestreams, each with a parseable date.
  // `instanceof Date` alone is not enough — an Invalid Date satisfies it and
  // then throws from .toISOString() further down — so check the time value.
  const dated = streams
    .filter((s) => SERVICE_TITLE.test(s.title))
    .map((s) => ({ ...s, date: serviceDateFromTitle(s.title) }))
    .filter(
      (s): s is (typeof s & { date: Date }) =>
        s.date instanceof Date && !Number.isNaN(s.date.getTime()),
    );

  const fromApi = dated.length > 0;
  const cutoff = Date.now() - AIRED_GRACE_MS;

  // --- Upcoming: parsed date still ahead, soonest first --------------------
  const futureAll: UpcomingService[] = dated
    .filter((s) => s.date.getTime() > cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((s) => ({
      videoId: s.videoId,
      title: s.title,
      scheduledFor: s.date.toISOString(),
      thumbnail: s.thumbnail || maxResThumb(s.videoId),
      thumbnailFallback: hqThumb(s.videoId),
      watchUrl: `https://www.youtube.com/watch?v=${s.videoId}`,
    }));

  // Prefer real scheduled broadcasts from the Streams tab (they carry an exact
  // scheduledStartTime). Fall back to title-date parsing, then to a computed
  // next Sunday.
  const scheduledServices: UpcomingService[] = scheduled
    .filter(
      (b) =>
        (SERVICE_TITLE.test(b.title) || b.title.trim() === "") &&
        b.scheduledFor &&
        Date.parse(b.scheduledFor) > cutoff,
    )
    .map((b) => ({
      videoId: b.videoId,
      title: SERVICE_TITLE.test(b.title) ? b.title : "Sunday Worship Service",
      scheduledFor: b.scheduledFor!,
      thumbnail: b.thumbnail || maxResThumb(b.videoId),
      thumbnailFallback: hqThumb(b.videoId),
      watchUrl: `https://www.youtube.com/watch?v=${b.videoId}`,
    }));

  const queue = scheduledServices.length > 0 ? scheduledServices : futureAll;
  let next: UpcomingService | null = queue[0] ?? null;
  const upcoming = queue.slice(1);

  if (!next) {
    // Nothing scheduled we can see — compute the next Sunday.
    const when = nextSundayNineAm();
    next = {
      videoId: null,
      title: "Sunday Worship Service",
      scheduledFor: when.toISOString(),
      thumbnail: null,
      thumbnailFallback: null,
      watchUrl: null,
    };
  }

  // --- Archive: parsed date in the past, newest first ---------------------
  let archive: ArchivedService[] = dated
    .filter((s) => s.date.getTime() <= cutoff)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((s) => ({
      videoId: s.videoId,
      title: s.title,
      description: s.description,
      servedOn: s.date.toISOString(),
      thumbnail: s.thumbnail || maxResThumb(s.videoId),
      thumbnailFallback: hqThumb(s.videoId),
      watchUrl: `https://www.youtube.com/watch?v=${s.videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${s.videoId}?rel=0`,
    }));

  // CCF does not leave finished Sunday streams under the "Worship with us
  // live!" title — it publishes the message itself as a separate upload and
  // the scheduled stream disappears from the search. So the archive of past
  // services is the sermon catalogue: the same service, correctly titled and
  // credited to the preacher.
  if (!archive.length) {
    const { messages } = await getTeaching();
    archive = messages.slice(0, 12).map((m) => ({
      videoId: m.sermon_video_key ?? "",
      title: m.title,
      description: m.description ?? "",
      servedOn: new Date(`${m.preached_on}T09:00:00+08:00`).toISOString(),
      thumbnail: m.thumbnail_url ?? maxResThumb(m.sermon_video_key ?? ""),
      thumbnailFallback: hqThumb(m.sermon_video_key ?? ""),
      watchUrl: `https://www.youtube.com/watch?v=${m.sermon_video_key}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${m.sermon_video_key}?rel=0`,
    }));
  }

  // Last resort: the public RSS feed, when even the catalogue is unavailable.
  if (!archive.length) {
    const rss = await getChannelVideos(25);
    archive = rss
      .filter((v) => SERVICE_TITLE.test(v.title) || v.isSundayService)
      .slice(0, 12)
      .map((v) => ({
        videoId: v.id,
        title: v.title,
        description: "",
        servedOn: v.published,
        thumbnail: maxResThumb(v.id),
        thumbnailFallback: hqThumb(v.id),
        watchUrl: v.href,
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0`,
      }));
  }

  return { live, next, upcoming, archive: archive.slice(0, 12), fromApi };
}

/** One archived service by video id, for the embed page. */
export async function getArchivedService(
  videoId: string,
): Promise<ArchivedService | null> {
  const { archive } = await getSundayServices();
  return archive.find((a) => a.videoId === videoId) ?? null;
}

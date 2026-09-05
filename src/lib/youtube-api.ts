import "server-only";

/**
 * YouTube Data API v3 client.
 *
 * Quota is the design constraint. The default allowance is 10,000 units a day
 * and search.list costs 100 units per call, so an uncached live check would
 * exhaust the day in about a hundred page views. Every call here is therefore
 * cached with an explicit revalidate window, and the expensive endpoint is
 * used sparingly and cached hardest relative to its cost.
 *
 *   search.list        100 units   live check, 60s cache
 *   playlists.list       1 unit    playlist metadata, 6h cache
 *   playlistItems.list   1 unit    videos in a playlist, 1h cache
 *   videos.list          1 unit    durations and scheduled starts, 1h cache
 *
 * The key is read from the server environment only. It has no NEXT_PUBLIC_
 * prefix, so it is never included in a client bundle.
 *
 * Every function fails soft. If the key is missing, the quota is exhausted, or
 * YouTube is unreachable, callers get null or an empty array and the page
 * falls back to the RSS feed in lib/youtube.ts or to seed data. The site never
 * breaks because of an upstream outage.
 */

const API = "https://www.googleapis.com/youtube/v3";

const KEY = process.env.YOUTUBE_API_KEY;

/* -------------------------------------------------------------------------
   Outbound rate control

   Several callers fan out with Promise.all (getFeaturedSeriesWithVideos,
   getChannelPlaylists' page loop, …), so a single cold render — no Next
   fetch cache to absorb it — can burst a dozen requests at YouTube in a
   few milliseconds and trip its short-window rate limit (HTTP 429, or 403
   with reason "rateLimitExceeded"/"userRateLimitExceeded"). Three guards:

     1. a small concurrency gate, so we never have more than MAX_CONCURRENCY
        requests in flight at once;
     2. in-flight de-duplication, so N concurrent identical calls share one
        fetch rather than each making their own;
     3. bounded retry with exponential backoff (honouring Retry-After) when
        YouTube does push back.
   ------------------------------------------------------------------------- */

const MAX_CONCURRENCY = 3;
const RETRY_DELAYS_MS = [400, 1_200, 3_000];

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function release(): void {
  active -= 1;
  const next = waiters.shift();
  if (next) {
    active += 1;
    next();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** In-flight fetches, keyed by full request URL, so concurrent identical
 *  calls await one shared promise instead of hitting YouTube each. */
const inflight = new Map<string, Promise<unknown>>();

/** Whether a 403 body is Google's rate-limit signal rather than a real
 *  quota/permission failure (which no amount of retrying will fix). */
function isRateLimit403(body: unknown): boolean {
  const reason = (body as {
    error?: { errors?: Array<{ reason?: string }> };
  })?.error?.errors?.[0]?.reason;
  return reason === "rateLimitExceeded" || reason === "userRateLimitExceeded";
}
export const CHANNEL_ID =
  process.env.YOUTUBE_CHANNEL_ID ?? "UCF1Wrrlls2ioQyn5WG-_nIQ";

/** Whether the API is configured at all. Callers use this to pick a fallback. */
export const hasYouTubeApi = Boolean(KEY);

interface Thumb {
  url: string;
  width?: number;
  height?: number;
}

interface ThumbSet {
  default?: Thumb;
  medium?: Thumb;
  high?: Thumb;
  standard?: Thumb;
  maxres?: Thumb;
}

/** Max-resolution thumbnail URL for a video. Keyless and hotlinkable. Not
 *  every video has a 1280x720 render, so callers should fall back on error. */
export function maxResThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

/** High-quality thumbnail that always exists (480x360). The safe fallback. */
export function hqThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Best available thumbnail, largest first. Prefers the API's own maxres URL;
 * when the API only returns smaller renders but we have the id, we still ask
 * for maxresdefault.jpg directly since it usually exists for real uploads.
 */
function pickThumb(t: ThumbSet | undefined, videoId?: string): string {
  return (
    t?.maxres?.url ??
    (videoId ? maxResThumb(videoId) : undefined) ??
    t?.standard?.url ??
    t?.high?.url ??
    t?.medium?.url ??
    t?.default?.url ??
    (videoId ? hqThumb(videoId) : "")
  );
}

async function call<T>(
  endpoint: string,
  params: Record<string, string>,
  revalidate: number,
): Promise<T | null> {
  if (!KEY) return null;

  const qs = new URLSearchParams({ ...params, key: KEY });
  const url = `${API}/${endpoint}?${qs}`;
  // Key without the api key, so the dedup key is stable but not secret-bearing
  // in any log. The URL itself is only held in memory.
  const dedupKey = `${endpoint}?${new URLSearchParams(params)}`;

  const existing = inflight.get(dedupKey);
  if (existing) return existing as Promise<T | null>;

  const run = (async (): Promise<T | null> => {
    const attempts = RETRY_DELAYS_MS.length + 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await acquire();
      let res: Response;
      try {
        res = await fetch(url, { next: { revalidate } });
      } catch (err) {
        release();
        // Network blip — retry a couple of times before giving up.
        if (attempt < attempts - 1) {
          await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
          continue;
        }
        console.warn(`[youtube] ${endpoint} threw:`, err);
        return null;
      }

      if (res.ok) {
        try {
          return (await res.json()) as T;
        } catch (err) {
          // A truncated or malformed body. Retrying can help (it is usually a
          // dropped connection), but never let it escape: this module's
          // contract is that callers get null rather than a thrown error.
          if (attempt < attempts - 1) {
            await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
            continue;
          }
          console.warn(`[youtube] ${endpoint} sent an unreadable body:`, err);
          return null;
        } finally {
          release();
        }
      }

      // Non-OK: decide whether this is worth retrying.
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* no JSON body */
      }
      release();

      const rateLimited =
        res.status === 429 ||
        (res.status === 403 && isRateLimit403(body)) ||
        (res.status >= 500 && res.status <= 599);

      if (rateLimited && attempt < attempts - 1) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1_000
          : RETRY_DELAYS_MS[attempt] ?? 0;
        console.warn(
          `[youtube] ${endpoint} ${res.status}, backing off ${wait}ms ` +
            `(attempt ${attempt + 1}/${attempts})`,
        );
        await sleep(wait);
        continue;
      }

      // A plain 403 is quota exhaustion or a key restriction — retrying
      // won't help. Log and hand the caller a clean null so it falls back.
      console.warn(
        `[youtube] ${endpoint} failed: ${res.status} ${res.statusText}`,
      );
      return null;
    }

    return null;
  })();

  inflight.set(dedupKey, run);
  try {
    return await run;
  } finally {
    inflight.delete(dedupKey);
  }
}

/* -------------------------------------------------------------------------
   Live status
   ------------------------------------------------------------------------- */

export interface LiveBroadcast {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  startedAt: string | null;
  concurrentViewers: number | null;
}

interface SearchResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: ThumbSet;
      publishedAt?: string;
    };
  }[];
}

interface VideosResponse {
  items?: {
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: ThumbSet;
      publishedAt?: string;
    };
    contentDetails?: { duration?: string };
    liveStreamingDetails?: {
      actualStartTime?: string;
      scheduledStartTime?: string;
      concurrentViewers?: string;
    };
  }[];
}

export interface StreamSearchItem {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

/**
 * Search the channel for videos matching a phrase, newest first.
 *
 * CCF titles every Sunday livestream "Worship with us live! | Sunday Service
 * (<Month Day, Year>)" — past and future alike — so one search over that
 * phrase returns the whole Sunday-service set, and the date in the title says
 * which are done and which are still to come. 100 units, cached 30 min.
 */
export async function searchChannel(
  query: string,
  max = 40,
): Promise<StreamSearchItem[]> {
  const res = await call<SearchResponse>(
    "search",
    {
      part: "snippet",
      channelId: CHANNEL_ID,
      type: "video",
      q: query,
      maxResults: String(Math.min(max, 50)),
      order: "date",
    },
    1_800,
  );

  return (res?.items ?? [])
    .filter((it) => it.id?.videoId)
    .map((it) => {
      const videoId = it.id!.videoId!;
      return {
        videoId,
        title: it.snippet?.title ?? "",
        description: it.snippet?.description ?? "",
        thumbnail: pickThumb(it.snippet?.thumbnails, videoId),
        publishedAt: it.snippet?.publishedAt ?? "",
      } satisfies StreamSearchItem;
    });
}

/**
 * The channel's current live broadcast, or null.
 *
 * Costs 100 units, so it is cached for 60 seconds. That is fresh enough that
 * a service appears live within a minute of starting, while capping the spend
 * at roughly 1,440 calls a day even under constant traffic.
 */
export async function getLiveBroadcast(): Promise<LiveBroadcast | null> {
  const search = await call<SearchResponse>(
    "search",
    {
      part: "snippet",
      channelId: CHANNEL_ID,
      eventType: "live",
      type: "video",
      maxResults: "1",
    },
    60,
  );

  const item = search?.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) return null;

  // One extra cheap call for start time and viewer count.
  const details = await call<VideosResponse>(
    "videos",
    { part: "liveStreamingDetails", id: videoId },
    60,
  );
  const live = details?.items?.[0]?.liveStreamingDetails;

  return {
    videoId,
    title: item?.snippet?.title ?? "Live now",
    description: item?.snippet?.description ?? "",
    thumbnail: pickThumb(item?.snippet?.thumbnails, videoId),
    startedAt: live?.actualStartTime ?? null,
    concurrentViewers: live?.concurrentViewers
      ? Number(live.concurrentViewers)
      : null,
  };
}

export interface ScheduledBroadcast {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  scheduledFor: string | null;
}

/**
 * Every scheduled-but-not-started broadcast CCF has queued, soonest first.
 *
 * CCF publishes its Sunday services weeks ahead, so this returns the whole
 * queue: callers take [0] as "the next one" and the tail as "future Sundays".
 * 100 units for the search plus 1 for the details batch, cached 10 minutes
 * since a schedule barely moves.
 */
export async function getUpcomingBroadcasts(
  max = 6,
): Promise<ScheduledBroadcast[]> {
  const search = await call<SearchResponse>(
    "search",
    {
      part: "snippet",
      channelId: CHANNEL_ID,
      eventType: "upcoming",
      type: "video",
      maxResults: String(Math.min(max, 25)),
      order: "date",
    },
    600,
  );

  const items = (search?.items ?? []).filter((it) => it.id?.videoId);
  if (!items.length) return [];

  const ids = items.map((it) => it.id!.videoId!).join(",");
  const details = await call<VideosResponse>(
    "videos",
    { part: "liveStreamingDetails,snippet", id: ids },
    600,
  );
  const startById = new Map(
    (details?.items ?? []).map((d) => [
      d.id,
      d.liveStreamingDetails?.scheduledStartTime ?? null,
    ]),
  );

  return items
    .map((it) => {
      const videoId = it.id!.videoId!;
      return {
        videoId,
        title: it.snippet?.title ?? "Upcoming service",
        description: it.snippet?.description ?? "",
        thumbnail: pickThumb(it.snippet?.thumbnails, videoId),
        scheduledFor: startById.get(videoId) ?? null,
      } satisfies ScheduledBroadcast;
    })
    .sort((a, b) => {
      const ta = a.scheduledFor ? Date.parse(a.scheduledFor) : Infinity;
      const tb = b.scheduledFor ? Date.parse(b.scheduledFor) : Infinity;
      return ta - tb;
    });
}

/** Back-compat: the single soonest upcoming broadcast, or null. */
export async function getUpcomingBroadcast(): Promise<ScheduledBroadcast | null> {
  return (await getUpcomingBroadcasts(1))[0] ?? null;
}

export interface CompletedBroadcast {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

interface CompletedSearchResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: ThumbSet;
      publishedAt?: string;
    };
  }[];
}

/**
 * Finished livestreams on the channel, newest first — the Sunday-service
 * archive. `search.list eventType=completed` is 100 units, plus 1 for a
 * details batch (durations and actual end times). Cached for an hour: a past
 * service does not change, and a service that just ended appears within the
 * hour.
 */
export async function getCompletedBroadcasts(
  max = 12,
): Promise<CompletedBroadcast[]> {
  const search = await call<CompletedSearchResponse>(
    "search",
    {
      part: "snippet",
      channelId: CHANNEL_ID,
      eventType: "completed",
      type: "video",
      maxResults: String(Math.min(max, 25)),
      order: "date",
    },
    3_600,
  );

  const items = (search?.items ?? []).filter((it) => it.id?.videoId);
  if (!items.length) return [];

  const ids = items.map((it) => it.id!.videoId!).join(",");
  const details = await call<VideosResponse>(
    "videos",
    { part: "contentDetails,liveStreamingDetails", id: ids },
    3_600,
  );
  const detailById = new Map(
    (details?.items ?? []).map((d) => [d.id, d]),
  );

  return items.map((it) => {
    const videoId = it.id!.videoId!;
    const d = detailById.get(videoId);
    return {
      videoId,
      title: it.snippet?.title ?? "Sunday service",
      description: it.snippet?.description ?? "",
      thumbnail: pickThumb(it.snippet?.thumbnails, videoId),
      publishedAt: it.snippet?.publishedAt ?? "",
      endedAt: d?.liveStreamingDetails?.actualStartTime ?? null,
      durationSeconds: d?.contentDetails?.duration
        ? parseDuration(d.contentDetails.duration)
        : null,
    } satisfies CompletedBroadcast;
  });
}

/* -------------------------------------------------------------------------
   Playlists
   ------------------------------------------------------------------------- */

export interface ApiPlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
}

interface PlaylistsResponse {
  items?: {
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: ThumbSet;
    };
    contentDetails?: { itemCount?: number };
  }[];
  nextPageToken?: string;
}

/**
 * Every playlist on the channel. 1 unit per page of 50, cached for six hours.
 */
export async function getChannelPlaylists(): Promise<ApiPlaylist[]> {
  const out: ApiPlaylist[] = [];
  let pageToken: string | undefined;

  // CCF has ~366 playlists. Eight pages of 50 covers the channel with room
  // to grow, and costs 8 units total against a 10,000/day allowance.
  for (let page = 0; page < 8; page++) {
    const res = await call<PlaylistsResponse>(
      "playlists",
      {
        part: "snippet,contentDetails",
        channelId: CHANNEL_ID,
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      },
      21_600,
    );
    if (!res?.items?.length) break;

    for (const p of res.items) {
      if (!p.id || !p.snippet?.title) continue;
      out.push({
        id: p.id,
        title: p.snippet.title,
        description: p.snippet.description ?? "",
        thumbnail: pickThumb(p.snippet.thumbnails),
        itemCount: p.contentDetails?.itemCount ?? 0,
      });
    }

    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }

  return out;
}

export interface ApiVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  position: number;
  href: string;
}

interface PlaylistItemsResponse {
  items?: {
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      position?: number;
      thumbnails?: ThumbSet;
      resourceId?: { videoId?: string };
    };
    contentDetails?: { videoPublishedAt?: string };
  }[];
}

type PlaylistItem = NonNullable<PlaylistItemsResponse["items"]>[number];

function toPlaylistVideo(it: PlaylistItem): ApiVideo | null {
  const id = it.snippet?.resourceId?.videoId;
  const title = it.snippet?.title;
  if (!id || !title) return null;
  // YouTube keeps removed videos in playlists under these titles.
  if (title === "Private video" || title === "Deleted video") return null;

  return {
    id,
    title,
    description: it.snippet?.description ?? "",
    thumbnail: pickThumb(it.snippet?.thumbnails, id),
    publishedAt:
      it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? "",
    position: it.snippet?.position ?? 0,
    href: `https://www.youtube.com/watch?v=${id}`,
  } satisfies ApiVideo;
}

/**
 * Videos inside a playlist, in playlist order. Pages through the playlist
 * (50 items / 1 unit each) until `limit` is reached or the playlist ends, so a
 * 60-part series comes back whole rather than truncated at the first page.
 * Cached for an hour. Deleted and private videos are dropped.
 */
export async function getPlaylistVideos(
  playlistId: string,
  limit = 200,
): Promise<ApiVideo[]> {
  const out: ApiVideo[] = [];
  let pageToken: string | undefined;

  while (out.length < limit) {
    const res = await call<PlaylistItemsResponse & { nextPageToken?: string }>(
      "playlistItems",
      {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: String(Math.min(limit - out.length, 50)),
        ...(pageToken ? { pageToken } : {}),
      },
      3_600,
    );

    if (!res?.items?.length) break;

    for (const it of res.items) {
      const v = toPlaylistVideo(it);
      if (v) out.push(v);
    }

    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }

  return out.slice(0, limit);
}

/* -------------------------------------------------------------------------
   Channel uploads
   ------------------------------------------------------------------------- */

interface ChannelsResponse {
  items?: {
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }[];
}

/**
 * The channel's uploads playlist id. Derived from the channel id by swapping
 * the "UC" prefix for "UU" — a documented YouTube invariant — so this costs
 * nothing. The API call is kept as a fallback for unusual channels.
 */
export async function getUploadsPlaylistId(): Promise<string | null> {
  if (CHANNEL_ID.startsWith("UC")) return `UU${CHANNEL_ID.slice(2)}`;

  const res = await call<ChannelsResponse>(
    "channels",
    { part: "contentDetails", id: CHANNEL_ID },
    86_400,
  );
  return res?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

/**
 * Everything the channel has uploaded, newest first, across several pages.
 *
 * 1 unit per page of 50. CCF publishes many short clips a week, so reaching a
 * year of Sunday messages takes several hundred items; eight pages costs 8
 * units and covers roughly five months of uploads at CCF's current rate.
 */
export async function getChannelUploads(pages = 8): Promise<ApiVideo[]> {
  const uploads = await getUploadsPlaylistId();
  if (!uploads) return [];

  const out: ApiVideo[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < pages; page++) {
    const res = await call<PlaylistItemsResponse & { nextPageToken?: string }>(
      "playlistItems",
      {
        part: "snippet,contentDetails",
        playlistId: uploads,
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      },
      3_600,
    );
    if (!res?.items?.length) break;

    for (const it of res.items) {
      const id = it.snippet?.resourceId?.videoId;
      const title = it.snippet?.title;
      if (!id || !title) continue;
      if (title === "Private video" || title === "Deleted video") continue;

      out.push({
        id,
        title,
        description: it.snippet?.description ?? "",
        thumbnail: pickThumb(it.snippet?.thumbnails, id),
        publishedAt:
          it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? "",
        position: it.snippet?.position ?? 0,
        href: `https://www.youtube.com/watch?v=${id}`,
      });
    }

    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }

  return out;
}

/* -------------------------------------------------------------------------
   Video details
   ------------------------------------------------------------------------- */

/**
 * ISO 8601 duration ("PT1H12M30S", "P1DT2H") to seconds. 0 if unparseable.
 *
 * The day component matters: YouTube emits `P#DT…` once a video runs past 24
 * hours, which a `PT`-only pattern silently scores as 0. Anchored so a string
 * that is not a duration fails outright rather than matching the empty run of
 * optional groups.
 */
export function parseDuration(iso: string): number {
  const m = iso.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (!m) return 0;

  const [, d, h, min, s] = m;
  if (d === undefined && h === undefined && min === undefined && s === undefined) {
    return 0;
  }

  return (
    Number(d ?? 0) * 86_400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Math.floor(Number(s ?? 0))
  );
}

/**
 * Durations for any number of videos, batched 50 per call (the API's cap).
 *
 * 1 unit per batch, so this is cheap even for a few hundred ids — far cheaper
 * than a call per video. Duplicate ids are collapsed first so a caller passing
 * a list with repeats does not pay for extra batches.
 */
export async function getVideoDurations(
  ids: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return out;

  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += 50) {
    batches.push(unique.slice(i, i + 50));
  }

  const responses = await Promise.all(
    batches.map((batch) =>
      call<VideosResponse>(
        "videos",
        { part: "contentDetails", id: batch.join(",") },
        3_600,
      ),
    ),
  );

  for (const res of responses) {
    for (const v of res?.items ?? []) {
      if (v.id && v.contentDetails?.duration) {
        out.set(v.id, parseDuration(v.contentDetails.duration));
      }
    }
  }
  return out;
}

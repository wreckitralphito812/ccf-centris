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

/** Best available thumbnail, largest first. */
function pickThumb(t: ThumbSet | undefined, videoId?: string): string {
  return (
    t?.maxres?.url ??
    t?.standard?.url ??
    t?.high?.url ??
    t?.medium?.url ??
    t?.default?.url ??
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "")
  );
}

async function call<T>(
  endpoint: string,
  params: Record<string, string>,
  revalidate: number,
): Promise<T | null> {
  if (!KEY) return null;

  const qs = new URLSearchParams({ ...params, key: KEY });
  try {
    const res = await fetch(`${API}/${endpoint}?${qs}`, {
      next: { revalidate },
    });
    if (!res.ok) {
      // 403 here is almost always quota exhaustion or a key restriction.
      // Log for the operator; the caller still gets a clean null.
      console.warn(
        `[youtube] ${endpoint} failed: ${res.status} ${res.statusText}`,
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[youtube] ${endpoint} threw:`, err);
    return null;
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

/**
 * The next scheduled broadcast, if CCF has one queued.
 * Also 100 units, cached for 10 minutes since a schedule rarely changes.
 */
export async function getUpcomingBroadcast(): Promise<{
  videoId: string;
  title: string;
  thumbnail: string;
  scheduledFor: string | null;
} | null> {
  const search = await call<SearchResponse>(
    "search",
    {
      part: "snippet",
      channelId: CHANNEL_ID,
      eventType: "upcoming",
      type: "video",
      maxResults: "1",
      order: "date",
    },
    600,
  );

  const item = search?.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) return null;

  const details = await call<VideosResponse>(
    "videos",
    { part: "liveStreamingDetails", id: videoId },
    600,
  );

  return {
    videoId,
    title: item?.snippet?.title ?? "Upcoming service",
    thumbnail: pickThumb(item?.snippet?.thumbnails, videoId),
    scheduledFor:
      details?.items?.[0]?.liveStreamingDetails?.scheduledStartTime ?? null,
  };
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

/**
 * Videos inside a playlist, in playlist order. 1 unit, cached for an hour.
 * Deleted and private videos are dropped rather than rendered as dead cards.
 */
export async function getPlaylistVideos(
  playlistId: string,
  limit = 50,
): Promise<ApiVideo[]> {
  const res = await call<PlaylistItemsResponse>(
    "playlistItems",
    {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: String(Math.min(limit, 50)),
    },
    3_600,
  );

  if (!res?.items?.length) return [];

  return res.items
    .map((it) => {
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
          it.contentDetails?.videoPublishedAt ??
          it.snippet?.publishedAt ??
          "",
        position: it.snippet?.position ?? 0,
        href: `https://www.youtube.com/watch?v=${id}`,
      } satisfies ApiVideo;
    })
    .filter((v): v is ApiVideo => v !== null);
}

/* -------------------------------------------------------------------------
   Video details
   ------------------------------------------------------------------------- */

/** ISO 8601 duration ("PT1H12M30S") to seconds. */
export function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Durations for up to 50 videos in one call. 1 unit total, so always batch
 * rather than calling per video.
 */
export async function getVideoDurations(
  ids: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!ids.length) return out;

  const res = await call<VideosResponse>(
    "videos",
    { part: "contentDetails", id: ids.slice(0, 50).join(",") },
    3_600,
  );

  for (const v of res?.items ?? []) {
    if (v.id && v.contentDetails?.duration) {
      out.set(v.id, parseDuration(v.contentDetails.duration));
    }
  }
  return out;
}

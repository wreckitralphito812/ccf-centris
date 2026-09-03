import "server-only";
import { YOUTUBE } from "./site";

/**
 * Live read of CCF's YouTube channel.
 *
 * The channel RSS feed is public, needs no API key, and lists the most recent
 * uploads including finished livestreams. We revalidate on an interval so the
 * site keeps pace with the channel without a rebuild, and every call fails
 * soft: if YouTube is unreachable the page still renders from seed data.
 */

export interface ChannelVideo {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  href: string;
  /** Sunday service uploads follow CCF's "Sunday Service" naming. */
  isSundayService: boolean;
}

const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE.channelId}`;

/** Revalidate every 15 minutes. Long enough to be cheap, short enough to matter. */
const REVALIDATE_SECONDS = 900;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Most recent videos on the channel, newest first.
 * Returns an empty array rather than throwing, so a feed outage never takes
 * a page down with it.
 */
export async function getChannelVideos(limit = 12): Promise<ChannelVideo[]> {
  let xml: string;
  try {
    const res = await fetch(FEED, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { "user-agent": "CCF-Centris-Site/1.0" },
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  const entries = xml.split("<entry>").slice(1);
  const out: ChannelVideo[] = [];

  for (const entry of entries) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const rawTitle = entry.match(/<media:title>([\s\S]*?)<\/media:title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !rawTitle || !published) continue;

    const title = decode(rawTitle.trim());

    out.push({
      id,
      title,
      published,
      // i.ytimg.com serves thumbnails without an API key.
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      href: `https://www.youtube.com/watch?v=${id}`,
      isSundayService: /sunday service|worship with us live/i.test(title),
    });

    if (out.length >= limit) break;
  }

  return out;
}

/** The most recent upload that looks like a Sunday service. */
export async function getLatestServiceVideo(): Promise<ChannelVideo | null> {
  const videos = await getChannelVideos(25);
  return videos.find((v) => v.isSundayService) ?? videos[0] ?? null;
}

/**
 * A short reel of recent uploads for ambient background playback.
 * Excludes nothing: any recent channel content is fair game as b-roll.
 */
export async function getBackgroundVideos(limit = 6): Promise<ChannelVideo[]> {
  return (await getChannelVideos(limit * 2)).slice(0, limit);
}

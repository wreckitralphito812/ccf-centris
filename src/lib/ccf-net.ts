import "server-only";

import { CCF_NET } from "@/lib/site";

/**
 * Last Sunday's replay, read from CCF Net (ccfnet.online.church).
 *
 * CCF Net runs on Life.Church's Church Online Platform, and its Sunday replays
 * are unlisted YouTube videos. Unlisted videos never appear in a channel feed
 * or in YouTube API search, so the only place the current replay is published
 * is CCF Net's own page. That page is server-rendered with Next.js; its
 * __NEXT_DATA__ carries the service video as an embed iframe at
 * props.initialState.service.content.video.source.
 *
 * Title, speaker and date come from YouTube's oEmbed endpoint, which does
 * answer for unlisted videos. CCF Net titles replays "Message | Speaker | Date".
 *
 * Every step degrades to null rather than throwing, so the Watch page can fall
 * back to a link instead of failing.
 */

const REVALIDATE_SECONDS = 60 * 30;

export interface Replay {
  videoId: string;
  /** The message title, e.g. "Who Are We Called To Love Today?" */
  title: string;
  speaker: string | null;
  /** The service date as CCF Net writes it, e.g. "September 6, 2026". */
  dateLabel: string | null;
  /** The same date as YYYY-MM-DD, or null when it can't be read. */
  date: string | null;
}

const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
const EMBED_ID = /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/;
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export async function getLatestReplay(): Promise<Replay | null> {
  const html = await fetchText(CCF_NET.url);
  const videoId = html ? videoIdFromCcfNetHtml(html) : null;
  if (!videoId) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembed = await fetchJson<{ title?: string }>(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`,
  );
  const parsed = oembed?.title ? parseReplayTitle(oembed.title) : null;

  return {
    videoId,
    title: parsed?.title ?? "Last Sunday’s message",
    speaker: parsed?.speaker ?? null,
    dateLabel: parsed?.dateLabel ?? null,
    date: parsed?.date ?? null,
  };
}

/** The YouTube id of the service video on a CCF Net page, or null. */
export function videoIdFromCcfNetHtml(html: string): string | null {
  const json = html.match(NEXT_DATA)?.[1];
  if (!json) return null;
  let source: unknown;
  try {
    source = JSON.parse(json)?.props?.initialState?.service?.content?.video
      ?.source;
  } catch {
    return null;
  }
  return typeof source === "string"
    ? (source.match(EMBED_ID)?.[1] ?? null)
    : null;
}

/** Split "Message | Speaker | Date" into its parts. */
export function parseReplayTitle(raw: string): Omit<Replay, "videoId"> {
  const [title = "", speaker = "", dateLabel = ""] = raw
    .split("|")
    .map((part) => part.trim());
  return {
    title: title || raw.trim(),
    speaker: speaker || null,
    dateLabel: dateLabel || null,
    date: dateLabel ? isoFromDateLabel(dateLabel) : null,
  };
}

/** "September 6, 2026" or "Sept. 6, 2026" to "2026-09-06"; null otherwise. */
export function isoFromDateLabel(label: string): string | null {
  const m = label.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const [, monthName = "", dayText = "", yearText = ""] = m;
  const month = MONTHS.findIndex((name) =>
    name.startsWith(monthName.toLowerCase()),
  );
  if (month < 0 || monthName.length < 3) return null;
  const day = Number(dayText);
  const year = Number(yearText);
  // Reject days the month doesn't have, like February 30.
  if (new Date(Date.UTC(year, month, day)).getUTCMonth() !== month) return null;
  return `${yearText}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CCF-Centris-Site" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

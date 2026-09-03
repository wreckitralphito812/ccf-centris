import "server-only";

import {
  getChannelPlaylists,
  getPlaylistVideos,
  hasYouTubeApi,
  type ApiPlaylist,
  type ApiVideo,
} from "./youtube-api";
import { channelPlaylists as seedPlaylists } from "@/data/playlists";

/**
 * The channel catalog, shaped for this site.
 *
 * CCF names playlists to a consistent pattern, which lets us group 366 raw
 * playlists into something a visitor can navigate:
 *
 *   "2026 Sunday Message: <Series>"   the Sunday teaching itself
 *   "<Series> - Run Through"          companion walkthrough
 *   "<Series> - Sunday Fast Track"    condensed version
 *   "<Series> - Snippets"             short clips
 *   "New Series: <Series>"            trailer
 *
 * Everything reads through here so pages never touch the raw API. When the
 * API key is absent or the quota is spent, this falls back to the captured
 * seed list, so the site degrades to slightly stale rather than empty.
 */

export type PlaylistKind =
  | "series"
  | "run_through"
  | "fast_track"
  | "snippets"
  | "trailer"
  | "podcast"
  | "special"
  | "other";

export interface CatalogPlaylist {
  id: string;
  /** CCF's own title, verbatim. */
  title: string;
  /** Title with CCF's prefixes and suffixes stripped, for grouping. */
  series: string;
  kind: PlaylistKind;
  description: string;
  thumbnail: string;
  itemCount: number;
  href: string;
}

export const KIND_LABEL: Record<PlaylistKind, string> = {
  series: "Sunday series",
  run_through: "Run Through",
  fast_track: "Fast Track",
  snippets: "Snippets",
  trailer: "Trailer",
  podcast: "Podcast",
  special: "Special",
  other: "Collection",
};

/** These are CCF's long-running master collections, not one series. */
const MASTER_PLAYLISTS = new Set([
  "Snippets",
  "Sunday Fast Track",
  "Run Through",
  "Testimonies",
  "Stories",
  "Afternoon Messages",
  "Church Online",
  "Intercede Weekly",
  "Intercede Daily",
  "Truth Matters",
]);

function classify(title: string): PlaylistKind {
  const t = title.toLowerCase();
  if (MASTER_PLAYLISTS.has(title.trim())) return "other";
  if (t.includes("run through")) return "run_through";
  if (t.includes("fast track")) return "fast_track";
  if (t.includes("snippet")) return "snippets";
  if (t.includes("podcast")) return "podcast";
  if (t.startsWith("new series")) return "trailer";
  if (/sunday message/.test(t)) return "series";
  if (/special|holy week|prayer and fasting|christmas|anniversary|weekend/.test(t))
    return "special";
  return "other";
}

/** Strip CCF's naming scaffolding to get the underlying series name. */
function seriesName(title: string): string {
  return title
    .replace(/^\d{4}\s+Sunday Message:\s*/i, "")
    .replace(/^Sunday Message:\s*/i, "")
    .replace(/^\d{4}\s+Special Message\s*[-–]\s*/i, "")
    .replace(/^New Series:\s*/i, "")
    .replace(/^\d{4}\s+/, "")
    .replace(/\s*[-–|]\s*(Run Through|Snippets|Sunday Fast Track)\s*$/i, "")
    .replace(/\s*[-–]\s*Worship in the Psalms$/i, "")
    .trim();
}

function toCatalog(p: ApiPlaylist): CatalogPlaylist {
  return {
    id: p.id,
    title: p.title,
    series: seriesName(p.title),
    kind: classify(p.title),
    description: p.description,
    thumbnail: p.thumbnail,
    itemCount: p.itemCount,
    href: `https://www.youtube.com/playlist?list=${p.id}`,
  };
}

/** Fallback shape built from the captured snapshot. */
function seedCatalog(): CatalogPlaylist[] {
  return seedPlaylists.map((p) => ({
    id: p.id,
    title: p.title,
    series: p.series,
    kind: classify(p.title),
    description: "",
    thumbnail: p.thumbVideo
      ? `https://i.ytimg.com/vi/${p.thumbVideo}/hqdefault.jpg`
      : "",
    itemCount: 0,
    href: `https://www.youtube.com/playlist?list=${p.id}`,
  }));
}

/** Every playlist on the channel, classified. */
export async function getCatalog(): Promise<CatalogPlaylist[]> {
  if (!hasYouTubeApi) return seedCatalog();
  const raw = await getChannelPlaylists();
  return raw.length ? raw.map(toCatalog) : seedCatalog();
}

export interface SeriesGroup {
  series: string;
  /** The main Sunday-message playlist, when CCF published one. */
  main: CatalogPlaylist | null;
  /** Run Through, Fast Track, Snippets, trailer. */
  companions: CatalogPlaylist[];
  /** Largest item count across the group, for sorting by substance. */
  totalVideos: number;
  cover: string;
}

/**
 * Teaching series, each with its companion playlists folded in.
 *
 * Only groups that actually look like a teaching series are returned: CCF's
 * master collections and one-off uploads are excluded, since they belong in
 * the collections shelf rather than the series archive.
 */
export async function getSeriesArchive(): Promise<SeriesGroup[]> {
  const catalog = await getCatalog();
  const groups = new Map<string, CatalogPlaylist[]>();

  for (const p of catalog) {
    if (p.kind === "other") continue;
    if (!p.series) continue;
    groups.set(p.series, [...(groups.get(p.series) ?? []), p]);
  }

  const out: SeriesGroup[] = [];

  for (const [series, items] of groups) {
    const main =
      items.find((i) => i.kind === "series") ??
      items.find((i) => i.kind === "special") ??
      null;
    const companions = items.filter((i) => i !== main);
    const cover =
      main?.thumbnail ||
      companions.find((c) => c.thumbnail)?.thumbnail ||
      "";

    out.push({
      series,
      main,
      companions,
      totalVideos: items.reduce((n, i) => n + i.itemCount, 0),
      cover,
    });
  }

  // A series with a real Sunday-message playlist outranks a lone trailer.
  return out.sort((a, b) => {
    if (!!a.main !== !!b.main) return a.main ? -1 : 1;
    return b.totalVideos - a.totalVideos;
  });
}

/** CCF's long-running collections: Snippets, Fast Track, Testimonies and so on. */
export async function getCollections(): Promise<CatalogPlaylist[]> {
  const catalog = await getCatalog();
  return catalog
    .filter((p) => p.kind === "other" && p.itemCount > 0)
    .sort((a, b) => b.itemCount - a.itemCount);
}

/** Videos in one playlist, for a series detail view. */
export async function getSeriesVideos(
  playlistId: string,
  limit = 50,
): Promise<ApiVideo[]> {
  if (!hasYouTubeApi) return [];
  return getPlaylistVideos(playlistId, limit);
}

export type { ApiVideo };

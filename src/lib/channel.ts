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

/** URL-safe slug for a series name, e.g. "ordinary-people-extraordinary-god". */
export function seriesSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

/** Playlists that look series-shaped but aren't a single teaching series. */
const NOT_A_SERIES =
  /chinese subtitle|with subtitle|afternoon message|midweek|prayer and fasting/i;

function classify(title: string): PlaylistKind {
  const t = title.toLowerCase();
  if (MASTER_PLAYLISTS.has(title.trim())) return "other";
  if (NOT_A_SERIES.test(title)) return "other";
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

/** A year in the playlist title, for newest-first sorting. 0 if none. */
function titleYear(title: string): number {
  const m = title.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : 0;
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
  slug: string;
  /**
   * The playlist to open when someone taps the series: its "Sunday Message"
   * playlist if CCF published one, otherwise the trailer or the fullest
   * companion. Always set for a group that made it into the archive.
   */
  main: CatalogPlaylist | null;
  /** Run Through, Fast Track, Snippets, trailer — whatever isn't `main`. */
  companions: CatalogPlaylist[];
  /** Largest item count across the group, for sorting by substance. */
  totalVideos: number;
  /** Year from a playlist title, for newest-first ordering. */
  year: number;
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
  // Catalog order is roughly newest-playlist-first (channel default), so the
  // first time we see a series marks how recent it is.
  const firstSeen = new Map<string, number>();

  catalog.forEach((p, i) => {
    if (p.kind === "other" || !p.series) return;
    groups.set(p.series, [...(groups.get(p.series) ?? []), p]);
    if (!firstSeen.has(p.series)) firstSeen.set(p.series, i);
  });

  const out: SeriesGroup[] = [];

  for (const [series, items] of groups) {
    // Prefer the Sunday-message playlist; fall back to a special, the
    // trailer, or the fullest companion so a brand-new series (which often
    // has only "New Series: …" + Run Through / Snippets) still gets a `main`.
    const byKind = (k: PlaylistKind) => items.find((i) => i.kind === k);
    const fullest = [...items].sort((a, b) => b.itemCount - a.itemCount)[0];
    const main =
      byKind("series") ??
      byKind("special") ??
      byKind("trailer") ??
      fullest ??
      null;
    const companions = items.filter((i) => i !== main);
    const cover =
      main?.thumbnail ||
      items.find((c) => c.thumbnail)?.thumbnail ||
      "";
    const year = Math.max(0, ...items.map((i) => titleYear(i.title)));

    out.push({
      series,
      slug: seriesSlug(series),
      main,
      companions,
      totalVideos: items.reduce((n, i) => n + i.itemCount, 0),
      year,
      cover,
    });
  }

  // Newest first: channel/catalog order, then any year in the title, then
  // how much was published under the series.
  return out.sort((a, b) => {
    const fa = firstSeen.get(a.series) ?? Infinity;
    const fb = firstSeen.get(b.series) ?? Infinity;
    if (fa !== fb) return fa - fb;
    if (a.year !== b.year) return b.year - a.year;
    return b.totalVideos - a.totalVideos;
  });
}

/**
 * The per-series "Sunday Fast Track" playlists — CCF's condensed cut of each
 * Sunday message, one playlist per teaching series. Newest series first. Seed
 * data always carries a couple of these, so the homepage shelf is never empty.
 */
export async function getFastTracks(n = 6): Promise<CatalogPlaylist[]> {
  const catalog = await getCatalog();
  const seen = new Set<string>();
  return catalog
    .filter((p) => p.kind === "fast_track" && p.series)
    // One per series — CCF only ships one Fast Track playlist per series, but
    // guard against a stray duplicate slipping in from the live API.
    .filter((p) => {
      if (seen.has(p.series)) return false;
      seen.add(p.series);
      return true;
    })
    .slice(0, n);
}

/** A playlist plus a trimmed list of its videos, for the homepage picker. */
export interface PlaylistVideo {
  id: string;
  title: string;
  publishedAt: string;
}

export interface PlaylistWithVideos extends CatalogPlaylist {
  videos: PlaylistVideo[];
}

function trimVideo(v: ApiVideo): PlaylistVideo {
  return { id: v.id, title: v.title, publishedAt: v.publishedAt };
}

/**
 * Fast Track playlists with their videos loaded, so the homepage card can list
 * every part and let a visitor pick one. Degrades to `videos: []` when the API
 * is unavailable — the card then falls back to a plain playlist embed.
 */
export async function getFastTracksWithVideos(
  n = 4,
): Promise<PlaylistWithVideos[]> {
  const tracks = await getFastTracks(n);
  if (!hasYouTubeApi) return tracks.map((p) => ({ ...p, videos: [] }));
  const lists = await Promise.all(
    tracks.map((p) => getPlaylistVideos(p.id, 200)),
  );
  return tracks.map((p, i) => ({
    ...p,
    videos: (lists[i] ?? []).map(trimVideo),
  }));
}

export interface SeriesGroupWithVideos extends SeriesGroup {
  videos: PlaylistVideo[];
}

/**
 * Featured teaching series with their main playlist's videos loaded, for the
 * homepage picker. Same degradation as {@link getFastTracksWithVideos}.
 */
export async function getFeaturedSeriesWithVideos(
  n = 3,
): Promise<SeriesGroupWithVideos[]> {
  const groups = await getFeaturedSeries(n);
  if (!hasYouTubeApi) return groups.map((g) => ({ ...g, videos: [] }));
  const lists = await Promise.all(
    groups.map((g) =>
      g.main ? getSeriesVideos(g.main.id, 200) : Promise.resolve([]),
    ),
  );
  return groups.map((g, i) => ({
    ...g,
    videos: (lists[i] ?? []).map(trimVideo),
  }));
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

/**
 * The N most substantial teaching series with a real Sunday-message playlist,
 * for the landing page and the section header. Falls back to the seed catalog.
 */
export async function getFeaturedSeries(n = 3): Promise<SeriesGroup[]> {
  const archive = await getSeriesArchive();
  return archive.filter((g) => g.main && g.cover).slice(0, n);
}

export interface SeriesDetail {
  group: SeriesGroup;
  /** Videos of the group's main playlist, in playlist order. */
  videos: ApiVideo[];
}

/**
 * One series by slug, with its main playlist's videos loaded — the payload
 * the expand-in-place section needs. Returns null if the slug is unknown.
 */
export async function getSeriesGroupBySlug(
  slug: string,
): Promise<SeriesDetail | null> {
  const archive = await getSeriesArchive();
  const group = archive.find((g) => g.slug === slug);
  if (!group) return null;

  const playlistId = group.main?.id ?? group.companions[0]?.id;
  const videos = playlistId ? await getSeriesVideos(playlistId, 200) : [];
  return { group, videos };
}

export type { ApiVideo };

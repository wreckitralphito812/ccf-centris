# Homepage series episode picker — design

**Date:** 2026-09-04
**Status:** Approved, ready for planning

## Problem

The homepage "Watch with CCF" section has two card shelves — **Sunday Fast Tracks**
and **Teaching series** — where each card embeds a playlist with
`<YouTubeEmbed playlistId={…}>`. On play, YouTube loads
`embed/videoseries?list=…&autoplay=1` and starts at item 1, exposing only its own
small ⏮/⏭ arrows. A visitor who wants a specific message (e.g. week 14 of a
30‑part series) has no in‑site way to get there — they must leave for YouTube.

## Solution

A new client component `SeriesPlayerCard` that pairs the inline player with a
scrollable, clickable episode list. Selecting an episode swaps the player to that
video. It replaces the two inline `<article>` card bodies in `page.tsx`
(Fast Tracks + Teaching series). The `/watch/series` page and its
`SeriesDisclosure` component are **not** touched.

## Component: `src/components/series-player-card.tsx` (`"use client"`)

### Props

```ts
{
  kindLabel: string;            // "Fast Track" | "Teaching series"
  series: string;               // display title
  playlistId: string;
  playlistHref: string;         // youtube.com/playlist?list=…
  cover: string;
  coverFallback: string;
  videos: { id: string; title: string; publishedAt: string }[];
}
```

### Layout

Reuses the existing card frame: `border border-hairline bg-paper-bright`, inside
the same outer `sm:grid-cols-2` (Fast Tracks) / `lg:grid-cols-3` (series) grids.

- **Player area (left/top), 16:9**
  - Idle: `YouTubeThumb` (cover) + clay ▶ button — the same facade
    `YouTubeEmbed` uses, so no request hits YouTube until the visitor presses
    play or picks an episode.
  - Playing: `<iframe src="https://www.youtube-nocookie.com/embed/{selectedId}?autoplay=1&rel=0">`.
  - State: `selectedId` (defaults to `videos[0]?.id`), `playing` (bool).
- **Episode list (right/bottom)**
  - `<ol>` inside a `max-h-[16rem] overflow-y-auto` scroll box on `sm+`.
  - On mobile the list stacks below the player, capped ~5 rows tall with scroll
    (not a 30‑row wall).
  - Each row: `Part 03` label, title (2‑line clamp), formatted date.
  - Selected row: `bg-paper` + clay left border. Clicking a row sets
    `selectedId` and `playing = true`.
- **Footer strip:** `{videos.length} parts` · `All parts on YouTube →`
  (`playlistHref`, `target="_blank"`).

### Degradation

If `videos` is empty (seed fallback when no API key, or quota spent), render
today's exact behavior: a single `<YouTubeEmbed playlistId={playlistId}>` with no
list. No regression.

## Data plumbing — `src/lib/channel.ts`

`getFastTracks` / `getFeaturedSeries` return catalog shapes with no video lists.
Add wrappers that attach them.

```ts
export interface PlaylistWithVideos extends CatalogPlaylist {
  videos: Pick<ApiVideo, "id" | "title" | "publishedAt">[];
}

export async function getFastTracksWithVideos(n = 4): Promise<PlaylistWithVideos[]>
```

- Calls existing `getFastTracks(n)`, then `Promise.all` over
  `getPlaylistVideos(p.id, 30)` (cap: 30 items/playlist).
- Maps each `ApiVideo` down to `{ id, title, publishedAt }`.
- On no API key / empty result → `videos: []`.

```ts
export interface SeriesGroupWithVideos extends SeriesGroup {
  videos: Pick<ApiVideo, "id" | "title" | "publishedAt">[];
}

export async function getFeaturedSeriesWithVideos(n = 3): Promise<SeriesGroupWithVideos[]>
```

- Calls existing `getFeaturedSeries(n)`, loads `g.main.id` videos via
  `getSeriesVideos(id, 30)` — mirrors what `/watch/series/page.tsx` already does
  for its `EAGER` rows.

### Quota

4 Fast Track playlists + 3 featured series = 7 extra `playlistItems` calls
(1 unit each) per revalidation. Page `revalidate = 3600` → ~168 units/day
against a 10,000/day quota. Negligible.

## `page.tsx` changes

- In the `Promise.all`, swap:
  - `getFastTracks(4)` → `getFastTracksWithVideos(4)`
  - `getFeaturedSeries(3)` → `getFeaturedSeriesWithVideos(3)`
- In `WatchWithCcf`, replace the Fast Tracks `.map(...)` `<article>` body and the
  Teaching series `.map(...)` `<article>` body with `<SeriesPlayerCard … />`.
- `BlockHead` blurbs updated to mention picking a part, e.g.
  "Press play, or pick any part from the list."

## Out of scope (YAGNI)

- No new route; no `/watch/series/[slug]` redesign.
- No search/filter inside the episode list (30 rows in a scroll box is fine).
- No "continue watching" / progress memory.
- No autoplay‑next when a video ends (would need the YT iframe API; the list is
  right there).

## Testing

- Manual, with API key: homepage cards show the episode list; clicking part 5
  plays part 5 inline.
- Manual, without API key: single embed renders, no console errors.
- `npm run typecheck` and `npm run build` both pass.

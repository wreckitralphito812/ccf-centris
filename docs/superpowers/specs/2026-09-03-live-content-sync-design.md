# CCF live public-content synchronization

**Date:** 2026-09-03
**Status:** Approved

## Purpose

Expand the CCF Centris site with official public resources and archives while
keeping `ccf.org.ph` authoritative. Content is synchronized in the background,
stored as normalized records, and served locally. A visitor request never
scrapes the upstream website.

The user confirmed authorization to collect CCF's public website content on
2026-09-03. The synchronization process must still honor the current
`robots.txt`, avoid the excluded WordPress REST routes, use bounded request
rates, and retain source provenance.

## Scope

This project includes:

1. Working resource downloads and resource filters.
2. Scripture Memory, Chronicle, and Intercede collections.
3. The historical message and 4Ws catalogues.
4. Articles, podcasts, broadcast channels, and a fuller missions page.
5. The GLC class catalogue, synchronized from `glc.ccf.org.ph`.
6. A repeatable synchronization command plus a scheduled CI workflow that
   regenerates and deploys the committed content snapshot.

Authenticated Dmember and Dleader resources are explicitly deferred. No
protected content is fetched, stored, or exposed in this phase. Member
accounts and role-gated member routes will receive a separate design.

## Product principles

- CCF remains the content owner and authoritative source.
- Public pages render from the local content repository, not from upstream
  requests made during page rendering.
- Downloads and media remain on CCF-controlled hosts unless CCF later supplies
  an approved asset library.
- Every synchronized record retains its canonical source URL and retrieval
  metadata.
- A failed synchronization cannot replace valid published content with empty,
  partial, or malformed content.
- The application needs no database or external service to render; it reads the
  committed content snapshot in every environment.

## Architecture

```text
CCF sitemap and public HTML pages
              |
              v
    bounded synchronization job
    fetch -> classify -> parse -> sanitize -> validate
              |
              v
   atomic write of the committed content snapshot
   (src/data/generated/public-content.json)
              |
              v
      content repository interface (src/lib/queries.ts)
              |
              v
        Next.js public routes
```

There is no database. Synchronized content is stored as a single normalized
JSON snapshot committed to the repository. Public pages read that snapshot
through the `src/lib/queries.ts` seam and never fetch upstream at request time.

The synchronization job runs as a local command (`npm run content:sync`), used
for development, validation, manual recovery, and by a scheduled CI workflow.
The workflow re-runs the command on a cadence, and — when the snapshot changed —
commits and deploys it. "The site updates whenever CCF ships new content" means
one workflow run later. No server endpoint and no runtime secret are involved.

## Synchronization policy

### Cadence

- Every six hours: resources, Scripture Memory, Chronicle, Intercede, articles,
  podcast listings, broadcast-channel information, missions links, and the GLC
  class catalogue.
- Daily: sermon sitemaps, message records, speakers, series/categories, and 4Ws.
- Manual full refresh: available through the local command for recovery or a
  deliberate re-import.

### Incremental behavior

The job reads the official sitemap index and compares each item's sitemap
`lastmod`, the checksum stored in the previous snapshot, and ETag/Last-Modified
values where available. Unchanged records are skipped. Changed records are
fetched at a bounded concurrency and normalized before the snapshot is rewritten.

Each record in the snapshot carries provenance:

- source URL, resolved URL, and canonical URL;
- upstream content class and stable WordPress identifier when present;
- sitemap modification time and retrieval time;
- content checksum and parser version;
- last successful synchronization time and, per section, the most recent error.

### Failure handling

- Network requests use timeouts, limited retries, and exponential backoff.
- HTTP failures and parse failures leave the previous snapshot in place; the
  affected section keeps its last good records and records the error.
- A section is rewritten only after its complete freshly-parsed batch passes
  schema validation. The snapshot is written atomically (temp file + rename).
- Empty responses, unexpected content types, redirect loops, and records with
  missing required identity fields are dropped from that run, never published.
- The local command refuses to run twice concurrently (a lock file) and prints
  a summary of inserted/updated/skipped/dropped counts per section.

## Data model

There is no database and no migration. The typed models for `messages`,
`series`, `speakers`, `four_ws`, and `resources` gain upstream identity and
provenance fields, and all synchronized content lives in one committed file:

`src/data/generated/public-content.json` — a normalized snapshot with a top-level
key per section:

- `resources`: slug, title, description, official URL, format, language,
  audience, external flag, and provenance.
- `scriptureMemory`: year, week, verse reference, verse text, raw date label,
  normalized date, view URL, download URL, and provenance.
- `chronicleIssues`: stable download id, title, related series, service date or
  date range (raw label plus normalized), download URL, displayed download count
  with its observation time, and provenance.
- `intercede`: campaign title, start/end dates, sanitized body HTML, Bible-plan
  URL, audio/video URLs, prayer-request path, and provenance.
- `glcClasses`: stable track key, title, GLC library category, description,
  delivery-format labels (face-to-face, Zoom, e-learning, Dgroup), workbook or
  materials download URL, sort order, active flag, and provenance.
- `articles`, `mediaChannels`: added by the later editorial/media plan, same
  shape convention.
- `meta`: per-section last-run time, checksums, parser version, and warnings.

The application reads only through the existing repository seam in
`src/lib/queries.ts`. Pages must not import the generated snapshot directly.
In development, preview, and production the repository reads the committed
snapshot; the current hand-authored seed data is retained only as the fallback
when a section is absent from the snapshot.

## Parsing and content rules

The parser operates on public HTML and sitemaps. It does not access `/wp-json/`,
`/?rest_route=`, authenticated pages, forms, or restricted resources.

Network fetching is permitted from `www.ccf.org.ph`, `ccf.org.ph`, and
`glc.ccf.org.ph`. The GLC host is fetched only for its published library index
and the class pages linked from it; GLC ordering, checkout, cart, account, and
`/wp-json/` routes are never requested. Other CCF sibling hosts remain
outbound-only links and are never enqueued.

HTML retained for article and resource bodies is sanitized against a narrow
allowlist: headings, paragraphs, lists, emphasis, block quotes, links, and
approved media embeds. Scripts, inline event handlers, forms, arbitrary styles,
iframes from unknown hosts, and unsafe URL schemes are removed.

Records are excluded when their paths or page classifications indicate:

- test, sandbox, UAT, maintenance, old-version, or duplicate staging pages;
- transaction success, failure, cancel, or payment response pages;
- login or restricted member pages;
- WordPress attachment shells;
- source-site 404s or redirect loops.

External links are allowed only through explicit protocol and hostname checks.
Links receive an external-source label when they leave the CCF host family.
Payment account numbers from the Giving snapshot are not imported by this
project.

## Public experience

### Resource library

`/grow/resources` becomes a working catalogue rather than a placeholder grid.
It supports keyword, content type, language, audience, and format filters. Each
card shows its source, format, language, and whether it opens an official
external download. Unavailable links display a clear disabled state instead of
a non-functional button.

### Scripture Memory

`/grow/resources/scripture-memory` shows the current week first and allows
browsing by year and week. Each record preserves CCF's verse reference and text
and links to the official downloadable or shareable asset when supplied.

### Chronicle

`/grow/resources/chronicle` groups issues by teaching series and date. It links
each issue to the matching message or series when that relationship is explicit
and sends downloads to the official CCF endpoint.

### Intercede

`/intercede` is a seasonal prayer-and-fasting hub containing the current
campaign dates, daily links, primer, fasting guidance, precautions, Bible plan,
audio/video destinations, and prayer-request path. When no campaign is active,
the most recent guide remains available with an honest archived state.

### Messages and 4Ws

The existing `/watch/messages`, message detail, series, speaker, and `/watch/4ws`
experiences are retained. Their repository gains historical records with source
metadata, AM/PM and format labels, companion Runthrough/Fast Track relationships,
and links to audio, notes, transcripts, and 4Ws when those fields are explicitly
available.

The homepage "Take it further" rail and every message-detail `#four-ws` section
render the current week's actual 4Ws from the synced record — the welcome
question, the passage, the Word questions, and the works step — with "Get the
guide" linking to CCF's official 4Ws PDF for that week. No hardcoded placeholder
description of the four movements remains in page source; generic copy is shown
only as a fallback when no guide has been published for the latest message yet.

The importer deduplicates canonical content while preserving distinct editions.
It never guesses a speaker, Scripture passage, or relationship solely from a
similar title. Heuristic matches may be stored as warnings but are not published
as confirmed relationships.

### Articles

`/articles` provides a paginated archive with topic, author, year, and keyword
filters. `/articles/[slug]` renders sanitized editorial content, attribution,
publication date, canonical source link, and related messages or resources when
the source explicitly provides them.

### Podcasts and broadcast channels

`/watch/podcasts` exposes podcast series already recognized by the channel
adapter and official Spotify/listening destinations. `/watch/broadcast-channels`
shows the currently published YouTube, Facebook, mobile-app, Spotify, and
video-on-demand options with their service schedule text and last-checked time.

### Missions

`/serve/missions` retains its Centris local-outreach content and adds distinct
Pray, Connect, Give, Go, and Stories pathways. Cross-property CCF Beyond links
remain outbound and visibly identified. This phase does not mirror the external
CCF Beyond website or missionary donation records.

### GLC classes

`/grow/glc` becomes a live catalogue rather than a placeholder. Classes are
grouped by GLC library category (GLC 1 EDIFY, GLC 2 EQUIP, GLC 3 EMPOW,
Apologetics, Biblical Foundations, Book Studies, Discipleship, Engage,
Evangelism, Leadership, Theology and Bible). Each entry shows its title,
description, delivery-format labels, and links out to its page on
`glc.ccf.org.ph`; workbook links point to the official GLC download when
supplied. The existing "GLC classes" navigation entry is unchanged. GLC
ordering and account flows are not reproduced.

### Navigation and search

The four-door navigation remains intact. New destinations are exposed from the
relevant landing pages and compact submenu entries rather than adding new
top-level navigation groups. Global search gains Resource, Scripture, Chronicle,
Article, and 4Ws result types.

## Accessibility and presentation

- Filter state is represented in the URL and remains usable without client-side
  JavaScript.
- Pagination uses real links with previous/next labels and appropriate landmark
  text.
- Download purpose, file format, external destination, and unavailable state are
  announced in text rather than by icon or color alone.
- Imported headings are normalized into the application's document hierarchy;
  upstream heading mistakes are not reproduced.
- Empty, loading, stale, and upstream-error states use the existing visual
  system and plain-language explanations.
- Layouts are verified at narrow mobile, tablet, desktop, and keyboard-only
  interaction sizes.

## Validation and testing

Automated checks cover:

- parser fixtures for every supported content class;
- URL allowlisting, unsafe-protocol rejection, and HTML sanitization;
- deterministic normalization and a stable, re-runnable snapshot write;
- sitemap `lastmod` and checksum-based incremental behavior;
- atomic snapshot writes and last-known-good retention after failures;
- message-edition deduplication and explicit relationship rules;
- repository reads falling back to seed data when a section is absent;
- resource download destinations and disabled states;
- filtering, pagination, metadata, canonical URLs, and global search results;
- the sync command's concurrency lock and per-section summary.

Release validation includes lint, TypeScript, production build, focused route
tests, and browser checks for the new and modified routes. Any repository-wide
failure caused by unrelated existing dirty work is reported separately from
focused validation.

## Operational visibility

Synchronization status lives in the snapshot's `meta` block and in the CI
workflow's run log: last successful run per section, counts of
inserted/updated/skipped/dropped records, and any bounded source failures. The
`content:sync` command prints the same summary and exits non-zero when a section
fails validation, so a failed scheduled run is visible in CI without shipping a
bad snapshot. A failed run never deletes existing records.

## Rollout sequence

1. Add source policy, provenance contracts, the snapshot store, and parser tests.
2. Make existing resource downloads functional.
3. Add Scripture Memory, Chronicle, and Intercede.
4. Add the GLC class catalogue.
5. Import and expose historical messages and 4Ws, and make the homepage and
   message-detail 4Ws blocks render the live current-week guide.
6. Add articles, podcasts, broadcast channels, expanded missions, and search.
7. Add the scheduled sync workflow, runbook, and complete browser verification.

Each step leaves the application in a usable state and can ship independently.

## Non-goals

- Dmember or Dleader authentication and protected content.
- Direct visitor-triggered scraping.
- WordPress REST API access.
- Mirroring CCF media binaries, payment workflows, or donation account data.
- Importing every sitemap record indiscriminately.
- Deep-crawling `glc.ccf.org.ph` beyond its published library index and the
  class pages linked from it; GLC e-commerce, ordering, cart, and account flows.
- Scraping the external CCF Beyond, events, school, or IDC websites.
- Replacing the current Centris facilities, booking, community, or care flows.

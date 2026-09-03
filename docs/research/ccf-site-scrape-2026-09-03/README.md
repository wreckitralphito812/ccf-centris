# CCF public-site content corpus

Completed: `2026-09-03T09:54:51+00:00`
Validated: `2026-09-03T10:03:52+00:00`

Authorized crawl of CCF's public website, seeded from its official Yoast sitemap and expanded through bounded same-host link discovery. It preserves server-rendered text, headings, metadata, provenance, links, downloads, images, embeds, and JSON-LD without mirroring media binaries.

## Coverage

- Official sitemap records inventoried: **5,359**
- Informational records extracted: **2,648**
- Sitemap-listed informational pages: **2,238**
- Additional linked/paginated pages: **410**
- Successful HTML responses: **2,641**
- Attachment records inventoried without binary downloads: **3,121**
- Site-side failures retained for audit: **7**

## Content classes

| Class | Records |
|---|---:|
| `sermon` | 1,382 |
| `page` | 518 |
| `taxonomy_archive` | 498 |
| `location` | 221 |
| `post` | 28 |
| `unknown` | 1 |

## Largest URL sections

| Section | Records |
|---|---:|
| `message` | 1,382 |
| `message-category` | 286 |
| `satellite-details` | 221 |
| `message-speaker` | 168 |
| `messages` | 52 |
| `location-categories` | 33 |
| `blog` | 28 |
| `give` | 23 |
| `dleaders-corner` | 9 |
| `author` | 8 |
| `our-position` | 8 |
| `beyond` | 6 |
| `articles` | 5 |
| `others` | 4 |
| `category` | 3 |
| `bulletin` | 3 |
| `live` | 3 |
| `motivate` | 3 |
| `dmembers-corner` | 3 |
| `4ws-god-is-forgiving-choose-forgiveness` | 2 |
| `4ws-god-is-forgiving-choose-forgiveness-goviral-edition` | 2 |
| `accept-jesus` | 2 |
| `be-prayed-for` | 2 |
| `button-response-first-time-guest` | 2 |
| `careers` | 2 |
| Other first-path sections | 388 |

## Known source-site issues

- Six sitemap/discovered URLs returned HTTP 404 and remain in `errors.jsonl` for traceability.
- `/discipleship-journey` redirects to itself indefinitely; it is recorded as a redirect-loop failure.
- Twelve HTTP-200 routes have no server-rendered body text. Five Giving routes are covered by the browser/API companion; the others are old, test, transaction, or placeholder pages.
- Ten successful pages omit a canonical tag; their exact source and resolved URLs remain preserved.

## Deliverables

- `content.jsonl` - complete extracted page corpus, one JSON object per line.
- `records-index.csv` - compact spreadsheet-friendly record index.
- `sitemap-urls.jsonl` - all 5,359 official sitemap URLs, including attachments.
- `discovered-urls.jsonl` - 410 extra internal pages and their discovery provenance.
- `giving-dynamic.json` / `giving-dynamic.md` - client-rendered Giving data and workflow.
- `errors.jsonl` - site-side 404 and redirect-loop records.
- `audit.json` - integrity checks, coverage metrics, hashes, and quality exceptions.
- `manifest.json` - crawl configuration, authorization basis, source sitemap, and robots snapshot.

## Limitations

- Public URLs absent from both the sitemap and traversed content links may not be represented.
- JavaScript-only content outside the Giving flow may be absent when no server-rendered copy exists.
- Authenticated areas, form submissions, robots-excluded REST routes, and media binaries were not accessed.
- The Giving snapshot includes publicly exposed donation account metadata; review handling and publication scope with CCF.

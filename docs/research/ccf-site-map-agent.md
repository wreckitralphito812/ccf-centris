# CCF public site map and crawl constraints

Observed 2026-09-03. This note maps the public discovery surface of `https://www.ccf.org.ph/` from CCF-owned pages and XML endpoints. It is an inventory and coverage plan, not a bulk copy of site content.

## Critical permission boundary

CCF's [Terms and Conditions](https://www.ccf.org.ph/terms-and-conditions/) say that visitors may download, cache, print, and redistribute pages for personal use, evangelism, or Bible-study discussion, subject to stated conditions. The same terms prohibit collecting user content/information or otherwise accessing the site with automated means—including bots, robots, spiders, or scrapers—without CCF's prior written permission. They also prohibit commercial reproduction/exploitation and modification of CCF-owned material.

That contractual restriction is broader than `robots.txt`. The user subsequently confirmed authorization for this task on 2026-09-03. This research pass nevertheless stayed low-volume: it sampled representative content classes to design the extraction model rather than bulk-fetching the sitemap. Before an operational crawl, retain evidence of the authorization and its allowed hosts, rate/concurrency limits, and content boundaries.

## Machine-discoverable crawl surface

CCF's live [`robots.txt`](https://www.ccf.org.ph/robots.txt) declares:

```text
User-agent: *
Disallow: /wp-json/
Disallow: /?rest_route=

User-agent: AdsBot
Disallow: /

Sitemap: https://www.ccf.org.ph/sitemap_index.xml
```

Implications:

- General crawlers are asked not to crawl the WordPress REST API through either route form.
- `AdsBot` is asked not to crawl any path.
- No crawl-delay is declared. Its absence is not permission to scrape or to use unbounded request rates.
- The REST endpoints remain publicly reachable but return an `X-Robots-Tag: noindex` header; reachability should not be confused with crawl permission.
- [`sitemap.xml`](https://www.ccf.org.ph/sitemap.xml) and [`wp-sitemap.xml`](https://www.ccf.org.ph/wp-sitemap.xml) redirect to the Yoast [`sitemap_index.xml`](https://www.ccf.org.ph/sitemap_index.xml).

### Sitemap inventory

The live index exposes 14 child sitemaps and 5,359 URL records in total at observation time:

| Child sitemap | URL records | Surface represented |
| --- | ---: | --- |
| [`post-sitemap.xml`](https://www.ccf.org.ph/post-sitemap.xml) | 28 | Blog posts |
| [`page-sitemap.xml`](https://www.ccf.org.ph/page-sitemap.xml) | 434 | WordPress pages, including core pages, 4WS resources, giving flows, restricted/login pages, and test/legacy-looking routes |
| [`attachment-sitemap.xml`](https://www.ccf.org.ph/attachment-sitemap.xml) | 1,000 | Media attachment pages |
| [`attachment-sitemap2.xml`](https://www.ccf.org.ph/attachment-sitemap2.xml) | 1,000 | Media attachment pages |
| [`attachment-sitemap3.xml`](https://www.ccf.org.ph/attachment-sitemap3.xml) | 1,000 | Media attachment pages |
| [`attachment-sitemap4.xml`](https://www.ccf.org.ph/attachment-sitemap4.xml) | 121 | Media attachment pages |
| [`location-sitemap.xml`](https://www.ccf.org.ph/location-sitemap.xml) | 221 | Satellite/location detail pages |
| [`sermon-sitemap.xml`](https://www.ccf.org.ph/sermon-sitemap.xml) | 1,000 | Sermon/message pages |
| [`sermon-sitemap2.xml`](https://www.ccf.org.ph/sermon-sitemap2.xml) | 382 | Sermon/message pages |
| [`category-sitemap.xml`](https://www.ccf.org.ph/category-sitemap.xml) | 1 | Blog category archive |
| [`location-categories-sitemap.xml`](https://www.ccf.org.ph/location-categories-sitemap.xml) | 24 | Location-country/category archives |
| [`sermon_category-sitemap.xml`](https://www.ccf.org.ph/sermon_category-sitemap.xml) | 101 | Sermon-series/category archives |
| [`sermon_speaker-sitemap.xml`](https://www.ccf.org.ph/sermon_speaker-sitemap.xml) | 46 | Speaker archives |
| [`author-sitemap.xml`](https://www.ccf.org.ph/author-sitemap.xml) | 1 | Author archive |

The sitemap is much broader than the visitor navigation. Of its 5,359 entries, 3,121 are attachment pages and 1,382 are sermon pages. The 434-page sitemap is also not a clean editorial IA: it includes transaction responses and routes whose names contain `test`, `sandbox`, `uat`, `old`, `v2`, `v3`, `maintenance`, or login/restricted markers. Examples visible in the sitemap include `/new-give-submit-sandbox/`, `/live-page-test/`, `/discipleship-journey-2024-old/`, and `/dleaders-corner/test-restricted/`. Any later ingestion should classify these separately rather than treating every sitemap entry as a public-facing section.

## Visitor-facing navigation

The following hierarchy is exposed by the global menu on the [CCF homepage](https://www.ccf.org.ph/) and repeated on the [Terms page](https://www.ccf.org.ph/terms-and-conditions/). Links under the main `www.ccf.org.ph` host are the principal scrape scope; linked sibling subdomains and other official properties are called out as hand-offs.

- **Home** — [`/`](https://www.ccf.org.ph/)
- **About** — [`/who-we-are/`](https://www.ccf.org.ph/who-we-are/)
  - Who We Are — same route as parent
  - Meet the Team — [`/meet-the-team/`](https://www.ccf.org.ph/meet-the-team/)
  - Location — [`/where-we-are/`](https://www.ccf.org.ph/where-we-are/)
  - Careers — [`/careers/`](https://www.ccf.org.ph/careers/)
  - Contact Us — [`/contact-us/`](https://www.ccf.org.ph/contact-us/)
- **Give** — [`/give/`](https://www.ccf.org.ph/give/)
  - Bills Payment — [`/give/bills-payment-tutorial/`](https://www.ccf.org.ph/give/bills-payment-tutorial/)
  - ATM/Debit/Credit Card — [`/give/#atm`](https://www.ccf.org.ph/give/#atm)
  - Bank Transfer/Deposit — [`/give/#banktransfer`](https://www.ccf.org.ph/give/#banktransfer)
  - Payment Channels — [`/give/#paymentchannels`](https://www.ccf.org.ph/give/#paymentchannels)
  - FAQs — [`/give/faqs/`](https://www.ccf.org.ph/give/faqs/)
- **Watch** — online service hand-off to [`ccfnet.online.church`](https://ccfnet.online.church/)
  - Online Service (Sundays) — same hand-off
  - Video On Demand / Sunday Messages — [`/messages/`](https://www.ccf.org.ph/messages/)
  - Broadcast Channels — [`/live/broadcast-channels/`](https://www.ccf.org.ph/live/broadcast-channels/)
  - Runthrough — [`/messages/?filter=runthrough`](https://www.ccf.org.ph/messages/?filter=runthrough)
  - Podcast — [`/podcast/`](https://www.ccf.org.ph/podcast/)
  - Spotify — CCF short-link hand-off at [`go.ccf.org.ph/CCFSpotify`](https://go.ccf.org.ph/CCFSpotify)
- **Connect** — [`/dgroup/`](https://www.ccf.org.ph/dgroup/)
  - Communities — [`/communities/`](https://www.ccf.org.ph/communities/)
- **Missions** — [`/beyond/`](https://www.ccf.org.ph/beyond/)
  - Pray, Connect, Give to Missions, and Stories and Articles hand off to matching sections on [`ccfbeyond.org`](https://www.ccfbeyond.org/)
- **Youth** — [`/elevate/`](https://www.ccf.org.ph/elevate/)
  - Serve — [`/elevate-serve/`](https://www.ccf.org.ph/elevate-serve/)
  - Support — [`/elevate-support/`](https://www.ccf.org.ph/elevate-support/)
- **Events** — hand-off to [`events.ccf.org.ph`](https://events.ccf.org.ph/)
  - What's Happening — same hand-off
  - Intercede — [`/intercede/`](https://www.ccf.org.ph/intercede/)
- **Resources** — [`/resources/`](https://www.ccf.org.ph/resources/)
  - Sunday Messages — [`/messages/`](https://www.ccf.org.ph/messages/)
  - Memory Verse — [`/52-week-scripture/`](https://www.ccf.org.ph/52-week-scripture/)
  - 4WS — [`/4ws/`](https://www.ccf.org.ph/4ws/)
  - Chronicle — [`/chronicle/`](https://www.ccf.org.ph/chronicle/)
  - Growth Materials — same route as parent
  - GLC — hand-off to [`glc.ccf.org.ph`](https://glc.ccf.org.ph/)
  - Articles — [`/articles/`](https://www.ccf.org.ph/articles/)
  - Motivate — [`/motivate/`](https://www.ccf.org.ph/motivate/)
  - Commemorative Magazine — third-party hand-off to Heyzine
- **Discipleship Corner**
  - Dgroup Project — [`/dgroup-project/`](https://www.ccf.org.ph/dgroup-project/)
  - Discipleship Journey — [`/discipleship-journey/`](https://www.ccf.org.ph/discipleship-journey/)
  - Dmembers Corner — [`/dmembers-corner/`](https://www.ccf.org.ph/dmembers-corner/)
  - Dleaders Corner — [`/dleaders-corner/`](https://www.ccf.org.ph/dleaders-corner/)
- **Other top-level hand-offs**
  - IDC — [`idc.org.ph`](https://idc.org.ph/)
  - School: LAI — [`lifeacademy.edu.ph`](https://lifeacademy.edu.ph/)
  - School: LCI — [`life.edu.ph`](https://life.edu.ph/)

The footer adds [`/terms-and-conditions/`](https://www.ccf.org.ph/terms-and-conditions/) and [`/privacy-policy/`](https://www.ccf.org.ph/privacy-policy/).

## Extraction schema

The authorized scraper should store a shared envelope for every record, then add fields specific to the detected content class. Detection should use several signals together: source sitemap, canonical path, WordPress `<body>` classes, page metadata, and visible content structure. Do not classify solely from a URL prefix.

### Shared record envelope

| Field | What to preserve |
| --- | --- |
| `source_url` | Exact discovered URL, including meaningful query/filter state |
| `canonical_url` | `<link rel="canonical">`; store separately from the fetch URL |
| `resolved_url` | Final URL after redirects |
| `content_class` | Normalized class such as `page`, `sermon`, `location`, `taxonomy_archive`, `resource_index`, `download`, `attachment`, or `post` |
| `wordpress_type`, `wordpress_id` | Parse body classes such as `page-id-18700`, `single-sermon postid-41832`, `single-location postid-34543`, or `tax-sermon_category term-346` |
| `http` | Status, content type, content length, content disposition, ETag/Last-Modified when supplied, and retrieval timestamp |
| `sitemap` | Parent sitemap URL and its per-entry `lastmod`; this is distinct from page publication or displayed dates |
| `document_meta` | HTML title, meta description, robots value, canonical, Open Graph/Twitter fields, JSON-LD objects, language/locale |
| `content` | Main-content HTML plus normalized text in DOM order; exclude duplicated global navigation, footer, search, and newsletter/contact chrome while retaining a versioned site-navigation record separately |
| `headings` | Every heading level and source order. Some CCF pages use lower heading levels for primary sections, so do not assume the first `h1` or `h2` contains the page title |
| `media` | Image source and `srcset`, alt text, caption, dimensions, nearby section, and attachment relationship; iframe/video title, dimensions, provider, and actual lazy-load URL from `data-src` as well as placeholder `src` |
| `links` | Link text, raw and resolved href, relationship/context, host classification, file/download status, and anchor/query components |
| `provenance` | Retrieval time, parser version, checksum of fetched bytes, and parse warnings; keep raw values beside normalized values |

All displayed counts, comments, likes, and download totals are time-varying observations and need an `observed_at` timestamp. Preserve Unicode punctuation and original language; do not translate or normalize away AM/PM, Runthrough, Bible references, or user-facing capitalization.

### Content-class samples and fields

#### General editorial page

Representative source: [Who We Are](https://www.ccf.org.ph/who-we-are/), a WordPress `page` with page ID `18700` when sampled.

Preserve:

- title, canonical URL, description, robots directives, modified timestamp, and structured data;
- ordered page sections and nested blocks, including mission, vision, core values, statement-of-faith questions and answers, position, and story/timeline entries;
- for timeline entries, the displayed year/range, narrative, associated image, image alt/caption, and source order;
- quotations and Scripture references as structured citation-like spans while retaining the complete original paragraph;
- calls to action, forms, anchors, and linked internal destinations.

The sample's principal section labels are not represented as top-level `h1`/`h2` elements consistently. The parser must use main-content boundaries and all heading levels, not heading rank alone.

#### Sermon/message

Representative source: [Experience Our Extraordinary God By Faith - PM - Runthrough](https://www.ccf.org.ph/message/experience-our-extraordinary-god-by-faith-pm-runthrough/), a `single-sermon` record with post ID `41832` when sampled.

Preserve:

- exact title plus parsed-but-non-destructive variants for service (`AM`/`PM`), format (`Runthrough`), and base message title;
- displayed day/month, sitemap `lastmod`, author name/profile URL, article modified time, language, description/body, comments count, and likes count;
- primary embed provider, iframe title, video ID/URL, and both `data-src` and placeholder `src`. This sample lazy-loads YouTube from `data-src`; reading only `src` would save a one-pixel GIF instead of the video reference;
- every “Other Resources” item with label, URL, host, and resource role. The sample links a Sunday Fast Track video and Praise and Worship resource;
- linked speaker, sermon category/series, tags, thumbnail/hero media, captions, transcript or notes when present. Store absent fields as absent rather than inferring them from title text;
- relationships between AM/PM, full-message, Runthrough, and translated variants when explicit links or stable normalized titles support them; mark heuristic relationships separately.

#### Location/satellite

Representative source: [CCF Urdaneta](https://www.ccf.org.ph/satellite-details/ccf-urdaneta/), a `single-location` record with post ID `34543` when sampled.

Preserve:

- satellite name, canonical URL, author, modified timestamp, and the source location-category/country when explicitly linked or supplied by its sitemap relationship;
- raw address lines and a normalized address object (`venue`, `street`, `city`, `province/state`, `postal_code`, `country`) without discarding the raw text;
- every contact label/value pair, including phone, email, social links, and service schedules;
- worship mode, service day/time, timezone if stated, and any notes such as “one service only”;
- map iframe `data-src`, provider query, zoom, and coordinates only when explicit. The sample uses a Google Maps query derived from its address rather than explicit coordinates;
- page media and any parent “Where We Are” relationship.

The sample renders `Fax: Face-to-face worship: 10:00am (one service only)`. Treat that as a parse warning: keep the complete raw line, then normalize the worship schedule only if rules or review can do so safely. Do not store the schedule as a fax number.

#### Taxonomy/archive

Representative source: [Work Matters message-category archive](https://www.ccf.org.ph/message-category/work-matters/), a `tax-sermon_category` / term ID `346` archive when sampled. Related samples were the [Peter Tanchi speaker archive](https://www.ccf.org.ph/message-speaker/peter-tanchi/) and [Philippines - Metro Manila location archive](https://www.ccf.org.ph/location-categories/ph-metromanila/).

Preserve:

- taxonomy name and slug, term ID, canonical URL, archive title/description, JSON-LD `CollectionPage`, and parent taxonomy if present;
- ordered entry cards with message URL, title, displayed date/time, author URL, excerpt, thumbnail, video URL appearing in the excerpt, comments/likes, language/service clues, and card position;
- pagination links, current page number, self-canonical URL, and terminal page. Work Matters exposes [page 2](https://www.ccf.org.ph/message-category/work-matters/page/2/); the sampled Peter Tanchi archive exposes 35 pages, and the Metro Manila location archive exposes three. Crawling only each taxonomy root is therefore incomplete;
- the relationship from each archive entry to this taxonomy term independently of taxonomy links found on the message page;
- archive/filter URLs as collection records, not duplicate sermon bodies.

Apply the same model to location categories, sermon speakers, blog categories, and the author archive, with `taxonomy_kind` distinguishing each class.

#### Downloadable resource and resource index

Representative index: [Chronicle](https://www.ccf.org.ph/chronicle/). Representative first-party download: [`/download/41878/`](https://www.ccf.org.ph/download/41878/), which returned a PDF attachment named `2026-Chronicle-0829-30-Anniv-Digital.pdf` with `Content-Type: application/pdf` and `Content-Length: 1156580` when sampled.

Preserve index-level data:

- resource collection title/description and series headings;
- each item label, date/date range, source order, download endpoint, stable numeric download ID, volatile query parameters, and displayed download count with observation timestamp;
- images/cover art and the relationship between a Chronicle issue, sermon series, and message where explicitly stated.

Preserve download-level data:

- request URL, final URL, status, MIME type, content disposition, original filename, byte length, ETag/Last-Modified, cryptographic checksum, and retrieval time;
- binary file separately from the HTML/index record, plus safely extracted document metadata/text when in scope;
- the stable `/download/{id}/` identity independently of transient `tmstv` query values. The sampled Chronicle index changed its `tmstv` value and displayed download totals between requests, confirming that neither is a stable identifier.

Secondary structured-resource sample: [4WS - Experience God's Extraordinary Favor](https://www.ccf.org.ph/4ws-experience-gods-extraordinary-favor/). Its page model should preserve title, publication date, worship song list, welcome prompt, Scripture passage/reference, ordered teaching sections, discussion questions, Pray/Care/Share actions, weekly prayer-point groups, memory verse, and the images that label those modules.

The [Growth Materials](https://www.ccf.org.ph/resources/) collection uses a different resource-card model. Preserve the audience/question section, resource title or question, description, thumbnail, action label/type (for example, video or handout), language, part number, and destination URL. Some handouts are first-party PDFs on the `glc.ccf.org.ph` sibling host, including the English and Filipino/Tagalog Best Decision Gospel Tracts; host scope must therefore be explicit even within CCF-operated properties.

### Parser safeguards

- Prefer the canonical URL for identity, but retain the exact discovery and resolved URLs for auditability.
- Record and honor page-level `robots`/`X-Robots-Tag` directives even under an authorized crawl.
- Resolve relative links and decode HTML entities without changing the original stored value.
- Deduplicate repeated desktop/mobile navigation and footer markup before producing page body text.
- Preserve lazy-loading attributes (`data-src`, `data-srcset`) and do not mistake placeholders for primary media.
- Keep raw labels and source fragments whenever normalization is uncertain; attach parse warnings rather than silently coercing malformed fields.
- Preserve the underlying excerpt and discovered media URLs when archive cards contain Visual Composer shortcode debris; store cleanup output separately from the source excerpt.
- Do not treat attachment pages, archives, or filtered listings as copies of their related canonical content records; model relationships between them.
- Rate-limit downloads separately from HTML, validate MIME type before parsing, cap file size, and never execute downloaded content.
- Treat the global `GET /?s=...` search as a discovery surface only when explicitly in scope, and never submit the repeated footer enquiry/contact form during a content crawl.

## Coverage and limitations

- **Covered:** the target host's current robots directives, canonical Yoast sitemap index, every child-sitemap class and record count, the complete global navigation hierarchy, footer legal routes, and cross-property hand-offs.
- **Sampled, not bulk-fetched:** one general page, sermon, location, taxonomy archive, Chronicle resource index/PDF endpoint, and structured 4WS resource page. The full 5,359 sitemap targets, forms, authenticated/restricted areas, WordPress REST API, search results, and linked properties on other hosts were not crawled.
- **Authorization and directives:** the user confirmed authorization for this task. The scraper should still preserve proof and scope of that authorization, respect CCF's terms, and honor the REST-path and AdsBot exclusions in `robots.txt`.
- **Snapshot caveat:** sitemap membership, counts, menu labels, and redirects are live state and can change. Preserve retrieval timestamps and re-read `robots.txt`, the terms, and the sitemap index before any authorized crawl.
- **Recommended next step:** record the confirmed permission together with allowed hosts, content classes, rate/concurrency ceilings, authentication boundaries, and storage/retention rules. Decide explicitly whether attachments and test/transaction-looking pages are in scope, then use the sitemap inventory as the crawl queue with the schema and safeguards above.

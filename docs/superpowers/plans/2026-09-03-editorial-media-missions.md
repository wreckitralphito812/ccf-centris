# Articles, Media, Missions, Search, and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish official articles, podcast and broadcast destinations, expanded missions pathways, global-search integration, and content-sync visibility.

**Architecture:** Extend the established synchronizer with typed editorial and media parsers, serve their records through the content repository, and compose routes from existing UI primitives. Missions remains Centris-focused with labeled CCF Beyond handoffs; until Admin authentication exists, operators read sync status only through a secret-protected endpoint.

**Tech Stack:** Next.js 16.3.4, React 19, TypeScript, Supabase, Cheerio, sanitize-html, Node test runner through tsx

**Spec:** docs/superpowers/specs/2026-09-03-live-content-sync-design.md

## Global Constraints

- Complete docs/superpowers/plans/2026-09-03-content-sync-foundation-resources.md first.
- Do not crawl or mirror CCF Beyond, Spotify, Facebook, YouTube, GLC, events, school, or IDC properties.
- Sanitize article HTML and never render upstream scripts, forms, arbitrary styles, or unknown iframes.
- Preserve the four-door navigation; add only compact contextual destinations.
- Preserve all unrelated dirty work and stage only files owned by the active task.

---

## File map

- src/lib/content/parsers/articles.ts: article index and detail parsing.
- src/lib/content/parsers/media.ts: podcast and broadcast parsing.
- src/lib/content/parsers/missions.ts: approved missions handoffs.
- supabase/migrations/0005_editorial_media.sql: article/media/missions records.
- src/app/articles/page.tsx: paginated article archive.
- src/app/articles/[slug]/page.tsx: sanitized detail route.
- src/app/watch/podcasts/page.tsx: podcast destinations.
- src/app/watch/broadcast-channels/page.tsx: current channels and schedules.
- src/app/serve/missions/page.tsx: Pray, Connect, Give, Go, and Stories paths.
- src/lib/queries.ts: editorial queries and global-search integration.
- src/app/api/cron/content-sync/status/route.ts: secret-protected sync status.
- docs/content-sync.md: operation and recovery runbook.

### Task 1: Model and parse editorial, media, and missions content

**Files:**
- Modify: src/lib/content/types.ts
- Create: supabase/migrations/0005_editorial_media.sql
- Create: src/lib/content/parsers/articles.ts
- Create: src/lib/content/parsers/media.ts
- Create: src/lib/content/parsers/missions.ts
- Create: src/lib/content/parsers/editorial.test.ts
- Create: src/lib/content/__fixtures__/articles-index.html
- Create: src/lib/content/__fixtures__/article.html
- Create: src/lib/content/__fixtures__/podcast.html
- Create: src/lib/content/__fixtures__/broadcast-channels.html
- Create: src/lib/content/__fixtures__/missions.html

**Interfaces:**
- Produces: ArticleRecord, MediaChannelRecord, MissionPathRecord, parseArticleIndex, parseArticlePage, parsePodcastPage, parseBroadcastChannels, and parseMissionPaths.

- [ ] **Step 1: Write failing parser tests**

~~~ts
test("sanitizes article bodies while preserving attribution", () => {
  const article = parseArticlePage(fixture("article.html")).record;
  assert.equal(article.authorName, "Christ's Commission Fellowship");
  assert.doesNotMatch(article.bodyHtml, /<script|onclick=/i);
  assert.match(article.bodyHtml, /<blockquote>/);
});

test("broadcast entries preserve platform and schedule", () => {
  const rows = parseBroadcastChannels(
    fixture("broadcast-channels.html"),
  ).records;
  assert.equal(rows[0].platform, "YouTube");
  assert.equal(rows[0].scheduleText, "Saturday Livestream 5:00 PM");
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/parsers/editorial.test.ts

Expected: FAIL because the parser modules are absent.

- [ ] **Step 3: Implement migration and parsers**

Create articles, media_channels, and mission_paths with source identity, publication generation, active state, order, and timestamps. Add public reads only for published rows. Sanitize article bodies and retain outbound media or missions URLs only after approved-link validation; never enqueue those outbound destinations.

- [ ] **Step 4: Test supported fixtures**

Run: npm run test:content -- src/lib/content/parsers/editorial.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/content/types.ts supabase/migrations/0005_editorial_media.sql src/lib/content/parsers src/lib/content/__fixtures__
git commit -m "feat: parse CCF editorial and media content"
~~~

### Task 2: Synchronize editorial content and expose queries

**Files:**
- Modify: src/lib/content/sync.ts
- Modify: src/lib/content/store.ts
- Modify: src/lib/queries.ts
- Modify: scripts/build-content-fallback.ts
- Modify: src/data/generated/public-content.json
- Test: src/lib/content/editorial-sync.test.ts
- Test: src/lib/content/editorial-queries.test.ts

**Interfaces:**
- Produces: listArticles(filters), getArticle(slug), listPodcastChannels(), listBroadcastChannels(), and listMissionPaths().

- [ ] **Step 1: Write failing sync and query tests**

~~~ts
test("article pagination is stable and newest first", async () => {
  const page = await listArticles({ page: 1, pageSize: 12 });
  assert.equal(page.items.length, 12);
  assert.ok(page.items[0].publishedAt >= page.items[1].publishedAt);
});

test("an outbound mission link is stored but never fetched", async () => {
  const summary = await runContentSync(missionsHarness);
  assert.equal(
    summary.fetchedUrls.includes("https://www.ccfbeyond.org/"),
    false,
  );
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/editorial-sync.test.ts src/lib/content/editorial-queries.test.ts

Expected: FAIL because editorial synchronization and queries are absent.

- [ ] **Step 3: Implement incremental synchronization and reads**

Synchronize the article index plus its 28 known public posts, podcast page, broadcast page, and approved CCF-host missions handoffs. Reuse source metadata, generation publication, stale-on-error behavior, and fallback selection from the resource plan.

- [ ] **Step 4: Refresh fallback and validate**

~~~powershell
npx tsx scripts/build-content-fallback.ts --input docs/research/ccf-site-scrape-2026-09-03/content.jsonl --output src/data/generated/public-content.json --include editorial
npm run test:content -- src/lib/content/editorial-sync.test.ts src/lib/content/editorial-queries.test.ts
~~~

Expected: deterministic output and passing tests.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/content/sync.ts src/lib/content/store.ts src/lib/queries.ts scripts/build-content-fallback.ts src/data/generated/public-content.json src/lib/content/editorial-sync.test.ts src/lib/content/editorial-queries.test.ts
git commit -m "feat: synchronize editorial and media content"
~~~

### Task 3: Build articles, podcasts, and broadcast routes

**Files:**
- Create: src/app/articles/page.tsx
- Create: src/app/articles/[slug]/page.tsx
- Create: src/app/watch/podcasts/page.tsx
- Create: src/app/watch/broadcast-channels/page.tsx
- Modify: src/lib/nav.ts
- Create: src/app/articles/article-route.test.ts
- Create: src/app/articles/articles.e2e.test.mjs

**Interfaces:**
- Consumes: editorial and media query functions.
- Produces: accessible archive, detail, podcast, and broadcast pages.

- [ ] **Step 1: Add the failing route-source test**

~~~ts
test("article detail exposes its canonical source", () => {
  const source = readFileSync(
    "src/app/articles/[slug]/page.tsx",
    "utf8",
  );
  assert.match(source, /article\.sourceUrl/);
  assert.match(source, /rel="noreferrer"/);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/app/articles/article-route.test.ts

Expected: FAIL because article routes are absent.

- [ ] **Step 3: Implement routes**

Use URL-backed author, year, and query filters with twelve-item pagination. Article detail renders sanitized server-side HTML, author/date/source attribution, canonical metadata, and explicit related records. Podcast and broadcast pages display platform, schedule, destination, and last-checked text without third-party scripts.

- [ ] **Step 4: Validate routes and browser behavior**

~~~powershell
npm run test:content -- src/app/articles/article-route.test.ts
npm run lint -- src/app/articles src/app/watch/podcasts src/app/watch/broadcast-channels src/lib/nav.ts
npm run typecheck
node src/app/articles/articles.e2e.test.mjs
~~~

The browser flow covers pagination, mobile filters, article semantics, outbound source links, podcast and broadcast destinations, and zero console errors.

- [ ] **Step 5: Commit**

~~~powershell
git add src/app/articles src/app/watch/podcasts src/app/watch/broadcast-channels src/lib/nav.ts
git commit -m "feat: publish articles and media channels"
~~~

### Task 4: Expand Missions and global search

**Files:**
- Modify: src/app/serve/missions/page.tsx
- Modify: src/lib/queries.ts
- Modify: src/app/search/page.tsx
- Test: src/lib/content/global-search.test.ts
- Create: src/app/serve/missions/missions.e2e.test.mjs

**Interfaces:**
- Produces: Resource, Scripture, Chronicle, Article, and 4Ws search hits plus five missions pathways.

- [ ] **Step 1: Write failing search coverage**

~~~ts
test("global search includes synchronized content kinds", async () => {
  const hits = await globalSearch("forgiveness");
  assert.ok(hits.some((hit) => hit.kind === "Article"));
  assert.ok(hits.some((hit) => hit.kind === "4Ws"));
  assert.ok(hits.some((hit) => hit.kind === "Resource"));
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/global-search.test.ts

Expected: FAIL because SearchHit does not include these kinds.

- [ ] **Step 3: Implement search and Missions paths**

Return synchronized results with stable local URLs and short sanitized excerpts. Add Pray, Connect, Give, Go, and Stories cards using current synchronized destinations, external labels, and a CCF Beyond explanation. Preserve existing Centris outreach content and event feed.

- [ ] **Step 4: Run focused and browser checks**

~~~powershell
npm run test:content -- src/lib/content/global-search.test.ts
npm run lint -- src/app/serve/missions src/app/search src/lib/queries.ts
npm run typecheck
node src/app/serve/missions/missions.e2e.test.mjs
~~~

Expected: desktop and 390px mobile checks pass with zero console errors.

- [ ] **Step 5: Commit**

~~~powershell
git add src/app/serve/missions src/app/search/page.tsx src/lib/queries.ts src/lib/content/global-search.test.ts
git commit -m "feat: expand missions and content search"
~~~

### Task 5: Add protected operational visibility and final verification

**Files:**
- Create: src/app/api/cron/content-sync/status/route.ts
- Create: src/app/api/cron/content-sync/status/route.test.ts
- Modify: docs/content-sync.md

**Interfaces:**
- Consumes: ContentStore.getSyncStatus().
- Produces: GET(request): Promise<Response> with secret-protected status JSON.

- [ ] **Step 1: Write the failing status-page test**

~~~ts
test("status rejects a request without the cron bearer secret", async () => {
  const response = await GET(new Request(
    "http://local/api/cron/content-sync/status",
  ));
  assert.equal(response.status, 401);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/app/api/cron/content-sync/status/route.test.ts

Expected: FAIL because the protected status route is absent.

- [ ] **Step 3: Implement protected status and finish the runbook**

Require the same timing-safe CONTENT_SYNC_SECRET bearer check used by the sync route. Return last success, duration, trigger, record counts, and bounded source errors without bodies, headers, or credentials. Document that a visible Admin page remains deferred until authentication gates /admin.

- [ ] **Step 4: Run final validation**

~~~powershell
npm run test:content
npm run lint
npm run typecheck
npm run build
git diff --check
~~~

Expected: required gates pass; unrelated dirty-checkout failures are reported separately with exact evidence.

- [ ] **Step 5: Commit**

~~~powershell
git add src/app/api/cron/content-sync/status docs/content-sync.md
git commit -m "feat: expose protected content sync status"
~~~

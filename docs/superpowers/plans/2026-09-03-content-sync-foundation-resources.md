# Content Sync Foundation and Resource Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the scheduled, cached CCF content pipeline and ship working Resources, Scripture Memory, Chronicle, and Intercede pages.

**Architecture:** A server-only TypeScript synchronizer reads approved CCF sitemaps and public HTML, parses and sanitizes typed records, and atomically upserts them into Supabase. Public queries use Supabase when configured and a normalized bundled snapshot otherwise; visitor requests never scrape upstream.

**Tech Stack:** Next.js 16.3.4 App Router, React 19, TypeScript, Supabase JS, Cheerio, sanitize-html, Node test runner through tsx

**Spec:** docs/superpowers/specs/2026-09-03-live-content-sync-design.md

## Global Constraints

- Do not access /wp-json/, /?rest_route=, authenticated pages, forms, or restricted resources.
- Do not import test, sandbox, UAT, old-version, payment-response, login, restricted, or attachment-shell routes.
- Do not copy media binaries, payment workflows, or donation account metadata.
- A failed sync must retain the last successfully published records.
- Public pages read only through repository functions; they do not import Supabase or generated JSON directly.
- Preserve all unrelated dirty work and stage only files owned by the active task.
- Read the relevant guides in node_modules/next/dist/docs/ before modifying Next.js route or cache behavior.

---

## File map

- src/lib/content/types.ts: normalized content and sync contracts.
- src/lib/content/source-policy.ts: approved hosts, excluded paths, and safe URL decisions.
- src/lib/content/html.ts: HTML sanitization and shared DOM helpers.
- src/lib/content/parsers/resources.ts: Resource, Scripture Memory, Chronicle, and Intercede parsers.
- src/lib/content/fetch-source.ts: bounded HTTP client with conditional requests.
- src/lib/content/store.ts: Supabase/fallback storage interface.
- src/lib/content/sync.ts: incremental orchestration, staging, and publication.
- src/lib/content/fallback.ts: normalized bundled snapshot loader.
- src/data/generated/public-content.json: compact last-known-good fallback.
- scripts/build-content-fallback.ts: fallback generator for the authorized corpus.
- scripts/sync-ccf-content.ts: local synchronization command.
- src/app/api/cron/content-sync/route.ts: secret-protected scheduler entry point.
- supabase/migrations/0003_public_content_sync.sql: content and provenance tables.
- src/app/grow/resources/page.tsx: functional resource library.
- src/app/grow/resources/scripture-memory/page.tsx: Scripture archive.
- src/app/grow/resources/chronicle/page.tsx: Chronicle archive.
- src/app/intercede/page.tsx: prayer-and-fasting hub.

### Task 1: Establish tests, contracts, and source policy

**Files:**
- Modify: package.json
- Modify: package-lock.json
- Create: src/lib/content/types.ts
- Create: src/lib/content/source-policy.ts
- Test: src/lib/content/source-policy.test.ts

**Interfaces:**
- Produces: ContentKind, SourceRecord, ResourceRecord, ScriptureMemoryRecord, ChronicleIssueRecord, IntercedeRecord, SourceDecision, and classifySourceUrl(url: URL): SourceDecision.

- [ ] **Step 1: Install dependencies and add the focused test command**

~~~powershell
npm install cheerio sanitize-html
npm install --save-dev tsx @types/sanitize-html
~~~

Add:

~~~json
"test:content": "tsx --test \"src/**/*.test.ts\""
~~~

- [ ] **Step 2: Write failing policy tests**

~~~ts
import assert from "node:assert/strict";
import test from "node:test";
import { classifySourceUrl } from "./source-policy";

test("allows an approved public page", () => {
  assert.deepEqual(classifySourceUrl(new URL("https://www.ccf.org.ph/chronicle/")), {
    allowed: true,
    reason: "approved_public_source",
  });
});

test("rejects REST, protected, staging, and foreign fetch targets", () => {
  for (const href of [
    "https://www.ccf.org.ph/wp-json/wp/v2/pages",
    "https://www.ccf.org.ph/dleaders-corner/login/",
    "https://www.ccf.org.ph/new-give-submit-sandbox/",
    "https://evil.example/chronicle/",
  ]) assert.equal(classifySourceUrl(new URL(href)).allowed, false);
});
~~~

- [ ] **Step 3: Run the test and confirm the missing-module failure**

Run: npm run test:content -- src/lib/content/source-policy.test.ts

Expected: FAIL because source-policy.ts does not exist.

- [ ] **Step 4: Implement the contracts and explicit policy**

Use discriminated records with required provenance:

~~~ts
export type ContentKind =
  | "resource"
  | "scripture_memory"
  | "chronicle"
  | "intercede";

export interface SourceRecord {
  sourceUrl: string;
  canonicalUrl: string;
  resolvedUrl: string;
  sourceModifiedAt: string | null;
  fetchedAt: string;
  checksum: string;
  parserVersion: string;
}

export type SourceDecision =
  | { allowed: true; reason: "approved_public_source" }
  | { allowed: false; reason: "host" | "rest" | "protected" | "staging" | "transaction" | "attachment" };
~~~

Permit network fetching only from www.ccf.org.ph and ccf.org.ph. Known CCF sibling hosts may be retained as outbound links but are never enqueued.

- [ ] **Step 5: Validate and commit**

~~~powershell
npm run test:content -- src/lib/content/source-policy.test.ts
npm run typecheck
git add package.json package-lock.json src/lib/content/types.ts src/lib/content/source-policy.ts src/lib/content/source-policy.test.ts
git commit -m "test: establish CCF content sync contracts"
~~~

### Task 2: Implement safe fetching and HTML helpers

**Files:**
- Create: src/lib/content/fetch-source.ts
- Create: src/lib/content/html.ts
- Test: src/lib/content/fetch-source.test.ts
- Test: src/lib/content/html.test.ts

**Interfaces:**
- Consumes: classifySourceUrl and SourceRecord.
- Produces: fetchSource(input: FetchSourceInput): Promise<FetchSourceResult>, sanitizeImportedHtml(html: string): string, mainContent($), and absoluteCcfUrl(value, base).

- [ ] **Step 1: Write failing conditional-request and sanitization tests**

~~~ts
test("sends validators and rejects non-HTML", async () => {
  const seen: Headers[] = [];
  const result = await fetchSource({
    url: new URL("https://www.ccf.org.ph/chronicle/"),
    etag: '"abc"',
    lastModified: "Wed, 02 Sep 2026 08:00:00 GMT",
    fetchImpl: async (_url, init) => {
      seen.push(new Headers(init?.headers));
      return new Response("binary", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    },
  });
  assert.equal(seen[0].get("if-none-match"), '"abc"');
  assert.equal(result.kind, "invalid_content_type");
});

test("removes executable markup and unsafe links", () => {
  const clean = sanitizeImportedHtml(
    '<p onclick="x()">Safe</p><script>x()</script><a href="javascript:x()">bad</a>',
  );
  assert.equal(clean, "<p>Safe</p><a>bad</a>");
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/fetch-source.test.ts src/lib/content/html.test.ts

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Implement bounded network and DOM behavior**

Use an 8-second abort timeout, no more than two retries for 429/5xx/network failures, 250 ms and 750 ms backoff, a descriptive user agent, a 5 MiB HTML ceiling, and source-policy validation before networking. Return typed outcomes for not_modified, ok, http_error, invalid_content_type, and too_large.

Allow only h2-h4, p, ul, ol, li, strong, em, blockquote, a, br, figure, figcaption, and img. Remove styles, scripts, forms, event attributes, unsafe schemes, and unknown iframes.

- [ ] **Step 4: Run focused tests**

Run: npm run test:content -- src/lib/content/fetch-source.test.ts src/lib/content/html.test.ts

Expected: PASS with no live network calls.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/content/fetch-source.ts src/lib/content/fetch-source.test.ts src/lib/content/html.ts src/lib/content/html.test.ts
git commit -m "feat: add safe CCF source fetching"
~~~

### Task 3: Parse the four resource collections

**Files:**
- Create: src/lib/content/parsers/resources.ts
- Create: src/lib/content/parsers/resources.test.ts
- Create: src/lib/content/__fixtures__/resources.html
- Create: src/lib/content/__fixtures__/scripture-memory.html
- Create: src/lib/content/__fixtures__/chronicle.html
- Create: src/lib/content/__fixtures__/intercede.html

**Interfaces:**
- Produces: parseResourcesPage, parseScriptureMemoryPage, parseChroniclePage, and parseIntercedePage. Each accepts html, source, and observedAt and returns typed records plus warnings.

- [ ] **Step 1: Extract minimal fixture fragments from the authorized corpus**

Keep only representative headings, labels, dates, links, and download anchors. Exclude global navigation, forms, scripts, and full page bodies.

- [ ] **Step 2: Write failing table-driven parser tests**

~~~ts
test("Chronicle identity does not depend on its download counter", () => {
  const result = parseChroniclePage(input("chronicle.html"));
  assert.equal(result.records[0].seriesTitle, "Ordinary People, Extraordinary God");
  assert.equal(result.records[0].serviceDateLabel, "Aug 29 and 30");
  assert.match(result.records[0].downloadUrl, /^https:\/\/www\.ccf\.org\.ph\/download\/\d+\//);
  assert.equal(result.records[0].downloadCountObservedAt, OBSERVED_AT);
});

test("parses the current Scripture week", () => {
  const result = parseScriptureMemoryPage(input("scripture-memory.html"));
  assert.equal(result.records[0].year, 2026);
  assert.equal(result.records[0].week, 35);
  assert.equal(result.records[0].reference, "Psalm 23:1");
});
~~~

- [ ] **Step 3: Run and confirm failure**

Run: npm run test:content -- src/lib/content/parsers/resources.test.ts

Expected: FAIL because the parser exports are absent.

- [ ] **Step 4: Implement all four parsers**

Preserve raw visible date labels beside normalized dates. Use null for missing optional fields. Reject records without stable identity. Resolve links against the canonical page and emit warnings for unparseable dates, weeks, or downloads.

- [ ] **Step 5: Test and commit**

~~~powershell
npm run test:content -- src/lib/content/parsers/resources.test.ts
git add src/lib/content/parsers/resources.ts src/lib/content/parsers/resources.test.ts src/lib/content/__fixtures__
git commit -m "feat: parse CCF resource collections"
~~~

### Task 4: Add storage and the bundled fallback

**Files:**
- Create: supabase/migrations/0003_public_content_sync.sql
- Create: src/lib/content/store.ts
- Create: src/lib/content/fallback.ts
- Create: scripts/build-content-fallback.ts
- Create: src/data/generated/public-content.json
- Test: src/lib/content/store.test.ts
- Modify: .env.example

**Interfaces:**
- Produces: ContentStore with stageBatch, publishBatch, failBatch, listResources, listScriptureMemory, listChronicleIssues, getIntercede, and getSyncStatus; createPublicContentStore(env): ContentStore; and createSyncContentStore(env): ContentStore.

- [ ] **Step 1: Write the failing atomic-publication test**

~~~ts
test("a failed batch leaves the published generation unchanged", async () => {
  const store = memoryStore(existingGeneration);
  const batch = await store.stageBatch("resources", [changedResource]);
  await store.failBatch(batch.id, "fixture parse failed");
  assert.deepEqual(await store.listResources({}), existingGeneration.resources);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/store.test.ts

Expected: FAIL because the store module is absent.

- [ ] **Step 3: Create migration and adapters**

Create content_sync_runs, content_sync_sources, scripture_memory, chronicle_issues, and intercede_campaigns. Extend resources with source, language, audience, format, publication, and generation fields. Add stable upstream unique keys, published-row read policies, and no browser write policy.

createPublicContentStore uses SUPABASE_URL and SUPABASE_ANON_KEY so public-read RLS remains enforced, or returns the read-only fallback store when they are absent. createSyncContentStore requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and has no fallback write mode. Keep the service key in a server-only module.

- [ ] **Step 4: Generate a deterministic fallback**

~~~powershell
npx tsx scripts/build-content-fallback.ts --input docs/research/ccf-site-scrape-2026-09-03/content.jsonl --output src/data/generated/public-content.json
~~~

The generator selects only approved collection records, normalizes through the production parsers, sorts deterministically, and omits raw HTML, site chrome, bank metadata, and unrelated crawl envelopes.

- [ ] **Step 5: Validate and commit**

~~~powershell
npm run test:content -- src/lib/content/store.test.ts
npm run typecheck
git add .env.example supabase/migrations/0003_public_content_sync.sql src/lib/content/store.ts src/lib/content/store.test.ts src/lib/content/fallback.ts scripts/build-content-fallback.ts src/data/generated/public-content.json
git commit -m "feat: store synchronized public content"
~~~

### Task 5: Implement sync orchestration, CLI, and scheduler endpoint

**Files:**
- Create: src/lib/content/sync.ts
- Create: src/lib/content/sync.test.ts
- Create: scripts/sync-ccf-content.ts
- Create: src/app/api/cron/content-sync/route.ts
- Create: src/app/api/cron/content-sync/route.test.ts
- Modify: package.json

**Interfaces:**
- Produces: runContentSync(options): Promise<SyncSummary> and POST(request): Promise<Response>.

- [ ] **Step 1: Write failing idempotency and authorization tests**

~~~ts
test("skips an unchanged source", async () => {
  const summary = await runContentSync(harness({
    etag: '"same"',
    responseStatus: 304,
  }));
  assert.deepEqual(summary.counts, {
    inserted: 0,
    updated: 0,
    skipped: 1,
    quarantined: 0,
  });
});

test("cron rejects a missing bearer secret", async () => {
  const response = await POST(new Request(
    "http://local/api/cron/content-sync",
    { method: "POST" },
  ));
  assert.equal(response.status, 401);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/sync.test.ts src/app/api/cron/content-sync/route.test.ts

Expected: FAIL because sync and route exports are absent.

- [ ] **Step 3: Implement orchestration**

Add public and teaching scopes, a store-backed advisory lock, conditional metadata, maximum concurrency of three, complete staged batches, atomic publication, per-source outcomes, and revalidateTag("ccf-public-content", "max") after successful publication.

Use a POST Route Handler with the Node runtime. Compare Authorization: Bearer CONTENT_SYNC_SECRET using a timing-safe comparison. Accept only public, teaching, or all scopes and never return exception stacks.

- [ ] **Step 4: Add and exercise the local command**

Add:

~~~json
"content:sync": "tsx scripts/sync-ccf-content.ts"
~~~

Run: npm run content:sync -- --scope public --dry-run

Expected: approved sources are fetched or reported unchanged, writes are skipped, and a JSON summary is printed.

- [ ] **Step 5: Test and commit**

~~~powershell
npm run test:content -- src/lib/content/sync.test.ts src/app/api/cron/content-sync/route.test.ts
npm run typecheck
git add package.json package-lock.json src/lib/content/sync.ts src/lib/content/sync.test.ts scripts/sync-ccf-content.ts src/app/api/cron/content-sync
git commit -m "feat: synchronize CCF public content"
~~~

### Task 6: Publish Resources, Scripture Memory, Chronicle, and Intercede

**Files:**
- Modify: src/lib/queries.ts
- Modify: src/lib/types.ts
- Modify: src/app/grow/resources/page.tsx
- Create: src/app/grow/resources/scripture-memory/page.tsx
- Create: src/app/grow/resources/chronicle/page.tsx
- Create: src/app/intercede/page.tsx
- Modify: src/lib/nav.ts
- Test: src/lib/content/public-queries.test.ts
- Test: src/app/grow/resources/resource-links.test.ts

**Interfaces:**
- Produces: findResources(filters), getScriptureMemory(year?), getChronicleIssues(series?), and getCurrentIntercede().

- [ ] **Step 1: Write failing query and link-state tests**

~~~ts
test("resource filters combine type, language, and text", async () => {
  const rows = await findResources({
    q: "decision",
    kind: "Handout",
    language: "Filipino",
  });
  assert.deepEqual(rows.map((row) => row.slug), ["best-decision-filipino"]);
});

test("resources with URLs render links, not inert buttons", () => {
  const source = readFileSync("src/app/grow/resources/page.tsx", "utf8");
  assert.match(source, /href=\{r\.url\}/);
  assert.doesNotMatch(source, /<button[\s\S]*?>\s*Download/);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/public-queries.test.ts src/app/grow/resources/resource-links.test.ts

Expected: FAIL because the new queries and functional link markup are absent.

- [ ] **Step 3: Implement queries and accessible pages**

Use server-rendered URL filters, real anchor elements for downloads, visible file/language/external labels, semantic pagination, and existing PageHeader, Section, Container, Pill, and EmptyState components. Intercede shows an archived label when its end date precedes the current Manila date.

- [ ] **Step 4: Validate**

~~~powershell
npm run test:content -- src/lib/content/public-queries.test.ts src/app/grow/resources/resource-links.test.ts
npm run lint -- src/app/grow/resources src/app/intercede src/lib/content src/lib/queries.ts src/lib/nav.ts
npm run typecheck
~~~

Expected: all focused checks pass.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/queries.ts src/lib/types.ts src/lib/nav.ts src/app/grow/resources src/app/intercede src/lib/content/public-queries.test.ts
git commit -m "feat: publish CCF resource collections"
~~~

### Task 7: Verify the first release

**Files:**
- Create: src/app/grow/resources/resources.e2e.test.mjs
- Create: docs/content-sync.md
- Modify: .env.example

**Interfaces:**
- Produces: reproducible browser coverage and operator documentation.

- [ ] **Step 1: Add the browser flow**

Verify desktop and 390px layouts, keyboard traversal, URL-backed filters, one official download destination without downloading the binary, Chronicle grouping, Scripture year navigation, Intercede archived/current copy, and zero console errors.

- [ ] **Step 2: Document operation**

Document SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CONTENT_SYNC_SECRET, scheduler calls, dry-run recovery, exclusions, last-known-good behavior, and credential rotation without including real values.

- [ ] **Step 3: Run all gates**

~~~powershell
npm run test:content
npm run lint
npm run typecheck
npm run build
~~~

Expected: all commands pass, aside from separately documented unrelated dirty-checkout failures.

- [ ] **Step 4: Run browser verification against one isolated server**

Start one dev or production server, run node src/app/grow/resources/resources.e2e.test.mjs, and stop it before invoking another Next command. Never run next dev and next build concurrently against .next.

- [ ] **Step 5: Commit verification artifacts**

~~~powershell
git add src/app/grow/resources/resources.e2e.test.mjs docs/content-sync.md .env.example
git commit -m "test: verify synchronized resource collections"
~~~

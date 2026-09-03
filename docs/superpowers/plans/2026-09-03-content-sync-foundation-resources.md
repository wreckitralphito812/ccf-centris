# Content Sync Foundation and Resource Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the scheduled, cached CCF content pipeline and ship working Resources, Scripture Memory, Chronicle, Intercede, and GLC catalogue pages.

**Architecture:** A TypeScript synchronizer reads approved CCF sitemaps and public HTML, parses and sanitizes typed records, and atomically rewrites a committed JSON snapshot (`src/data/generated/public-content.json`). Public queries read that snapshot through `src/lib/queries.ts`, falling back to the existing seed data per section; visitor requests never scrape upstream. There is no database. A scheduled CI workflow re-runs the sync command and commits the refreshed snapshot.

**Tech Stack:** Next.js 16.3.4 App Router, React 19, TypeScript, Cheerio, sanitize-html, Node test runner through tsx

**Spec:** docs/superpowers/specs/2026-09-03-live-content-sync-design.md

## Global Constraints

- Do not access /wp-json/, /?rest_route=, authenticated pages, forms, or restricted resources.
- Network fetching is limited to www.ccf.org.ph, ccf.org.ph, and glc.ccf.org.ph. The GLC host is fetched only for its published library index and the class pages linked from it; never GLC ordering, cart, checkout, account, or /wp-json/ routes.
- Do not import test, sandbox, UAT, old-version, payment-response, login, restricted, or attachment-shell routes.
- Do not copy media binaries, payment workflows, or donation account metadata.
- A failed sync must retain the last successfully published records.
- Public pages read only through repository functions in src/lib/queries.ts; they do not import the generated snapshot JSON directly.
- Preserve all unrelated dirty work and stage only files owned by the active task.
- Read the relevant guides in node_modules/next/dist/docs/ before modifying Next.js route or cache behavior.

---

## File map

- src/lib/content/types.ts: normalized content and sync contracts.
- src/lib/content/source-policy.ts: approved hosts, excluded paths, and safe URL decisions.
- src/lib/content/html.ts: HTML sanitization and shared DOM helpers.
- src/lib/content/parsers/resources.ts: Resource, Scripture Memory, Chronicle, and Intercede parsers.
- src/lib/content/parsers/glc.ts: GLC library index and class-page parser.
- src/lib/content/fetch-source.ts: bounded HTTP client with conditional requests.
- src/lib/content/snapshot.ts: read/validate/atomically write the committed content snapshot.
- src/lib/content/sync.ts: incremental orchestration and per-section validation.
- src/data/generated/public-content.json: the committed content snapshot (last-known-good).
- scripts/seed-content-snapshot.ts: one-time snapshot seed from the authorized corpus.
- scripts/sync-ccf-content.ts: local synchronization command (also run by CI).
- src/app/grow/resources/page.tsx: functional resource library.
- src/app/grow/resources/scripture-memory/page.tsx: Scripture archive.
- src/app/grow/resources/chronicle/page.tsx: Chronicle archive.
- src/app/intercede/page.tsx: prayer-and-fasting hub.
- src/app/grow/glc/page.tsx: live GLC class catalogue grouped by library category.

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
  | "intercede"
  | "glc_class";

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

Permit network fetching from www.ccf.org.ph, ccf.org.ph, and glc.ccf.org.ph. For glc.ccf.org.ph, allow only the published library index and class pages; reject ordering, cart, checkout, account, and /wp-json/ paths with reason "protected" or "transaction". Other known CCF sibling hosts may be retained as outbound links but are never enqueued. Add a policy test asserting `classifySourceUrl(new URL("https://glc.ccf.org.ph/glc-library/"))` is allowed and `https://glc.ccf.org.ph/my-account/` is rejected.

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

### Task 4: Add the snapshot store and seed it

**Files:**
- Create: src/lib/content/snapshot.ts
- Create: src/lib/content/snapshot.test.ts
- Create: scripts/seed-content-snapshot.ts
- Create: src/data/generated/public-content.json

**Interfaces:**
- Produces: ContentSnapshot type; readSnapshot(): ContentSnapshot; writeSnapshot(next: ContentSnapshot): void (atomic temp-file + rename); replaceSection<K>(snap, key, records, meta): ContentSnapshot; and validateSection(key, records): { ok: true } | { ok: false; errors: string[] }.

- [ ] **Step 1: Write the failing retention + atomic-write test**

~~~ts
test("a failed section validation leaves the prior snapshot untouched", () => {
  const prior = readSnapshot();
  const bad = replaceSection(prior, "resources", [{ slug: "" } as never], meta());
  const check = validateSection("resources", bad.resources);
  assert.equal(check.ok, false);
  assert.deepEqual(readSnapshot().resources, prior.resources); // never written
});

test("writeSnapshot is atomic and round-trips", () => {
  const snap = readSnapshot();
  writeSnapshot(snap);
  assert.deepEqual(readSnapshot(), snap);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/snapshot.test.ts

Expected: FAIL because the snapshot module is absent.

- [ ] **Step 3: Implement the snapshot store**

`ContentSnapshot` has one key per section (`resources`, `scriptureMemory`, `chronicleIssues`, `intercede`, `glcClasses`) plus `meta` (per-section `lastRunAt`, `checksum`, `parserVersion`, `warnings`). `readSnapshot` reads `src/data/generated/public-content.json` and returns an empty-but-shaped snapshot if the file is missing. `writeSnapshot` writes pretty JSON with sorted keys to `<file>.tmp` then renames over the target. `replaceSection` returns a new snapshot with that section and its meta swapped, others untouched. `validateSection` runs the per-kind required-identity checks (non-empty slug/trackKey, integer year/week, `/download/{id}/` URL shape, etc.).

- [ ] **Step 4: Seed the snapshot from the authorized corpus**

~~~powershell
npx tsx scripts/seed-content-snapshot.ts --input docs/research/ccf-site-scrape-2026-09-03/content.jsonl --output src/data/generated/public-content.json
~~~

The seeder feeds the corpus's structured records through the production parsers, keeps only the five approved sections, sorts deterministically, drops raw HTML / site chrome / bank metadata / unrelated crawl envelopes, and stamps `meta`.

- [ ] **Step 5: Validate and commit**

~~~powershell
npm run test:content -- src/lib/content/snapshot.test.ts
npm run typecheck
git add src/lib/content/snapshot.ts src/lib/content/snapshot.test.ts scripts/seed-content-snapshot.ts src/data/generated/public-content.json
git commit -m "feat: store synchronized content as a committed snapshot"
~~~

### Task 5: Implement sync orchestration and the local command

**Files:**
- Create: src/lib/content/sync.ts
- Create: src/lib/content/sync.test.ts
- Create: scripts/sync-ccf-content.ts
- Modify: package.json

**Interfaces:**
- Produces: runContentSync(options): Promise<SyncSummary>, where SyncSummary has per-section `{ inserted, updated, skipped, dropped, error }`.

- [ ] **Step 1: Write failing idempotency and retention tests**

~~~ts
test("skips an unchanged source", async () => {
  const summary = await runContentSync(harness({ etag: '"same"', responseStatus: 304 }));
  assert.deepEqual(summary.sections.chronicleIssues, {
    inserted: 0, updated: 0, skipped: 1, dropped: 0, error: null,
  });
});

test("a section that fails validation keeps its prior records and reports error", async () => {
  const summary = await runContentSync(harnessWithMalformedChronicle);
  assert.match(summary.sections.chronicleIssues.error ?? "", /identity/);
  assert.deepEqual(readSnapshot().chronicleIssues, priorChronicle);
});

test("a second run with no upstream change writes nothing", async () => {
  await runContentSync(harness());
  const before = readFileSync(SNAPSHOT_PATH, "utf8");
  await runContentSync(harness());
  assert.equal(readFileSync(SNAPSHOT_PATH, "utf8"), before);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/sync.test.ts

Expected: FAIL because sync exports are absent.

- [ ] **Step 3: Implement orchestration**

`runContentSync({ sections, fetchImpl, now })` iterates the requested sections (default: all five public sections — resources, scriptureMemory, chronicleIssues, intercede, glcClasses). For each: read the section's source URL(s), send conditional validators from the snapshot's `meta` checksum/etag, skip on 304 or unchanged checksum, otherwise parse + sanitize + `validateSection`. On success, `replaceSection`; on failure, leave the section and record the error. Bounded concurrency of three across section fetches. Write the snapshot once at the end, atomically, only if at least one section changed. Acquire a lock file (`.content-sync.lock`) and refuse to start if held. Return the `SyncSummary`; the process exits non-zero if any section has a non-null `error`.

- [ ] **Step 4: Add and exercise the local command**

Add:

~~~json
"content:sync": "tsx scripts/sync-ccf-content.ts"
~~~

The script parses `--sections a,b`, `--dry-run` (parse and validate but never write the snapshot), and `--json` (print the summary as JSON). It prints a per-section table and exits non-zero on any section error.

Run: npm run content:sync -- --dry-run

Expected: approved sources are fetched or reported unchanged, no snapshot write occurs, and a per-section summary is printed.

- [ ] **Step 5: Test and commit**

~~~powershell
npm run test:content -- src/lib/content/sync.test.ts
npm run typecheck
git add package.json package-lock.json src/lib/content/sync.ts src/lib/content/sync.test.ts scripts/sync-ccf-content.ts
git commit -m "feat: synchronize CCF public content into the snapshot"
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

`src/lib/queries.ts` reads the committed snapshot via `readSnapshot()`; when a section is empty it falls back to the existing hand-authored seed data. Pages import only these query functions, never the snapshot JSON. Use server-rendered URL filters, real anchor elements for downloads, visible file/language/external labels, semantic pagination, and existing PageHeader, Section, Container, Pill, and EmptyState components. Intercede shows an archived label when its end date precedes the current Manila date.

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

### Task 7: Add the scheduled workflow and verify the first release

**Files:**
- Create: src/app/grow/resources/resources.e2e.test.mjs
- Create: docs/content-sync.md
- Create: .github/workflows/content-sync.yml

**Interfaces:**
- Produces: reproducible browser coverage, an operator runbook, and a scheduled sync workflow.

- [ ] **Step 1: Add the browser flow**

Verify desktop and 390px layouts, keyboard traversal, URL-backed filters, one official download destination without downloading the binary, Chronicle grouping, Scripture year navigation, Intercede archived/current copy, GLC category grouping, and zero console errors.

- [ ] **Step 2: Add the scheduled sync workflow**

`.github/workflows/content-sync.yml`: runs on a `schedule` (every 6 hours) and `workflow_dispatch`. Steps: checkout, setup Node, `npm ci`, `npm run content:sync`, then — if `git status --porcelain` shows `src/data/generated/public-content.json` changed — commit it with a `chore: refresh CCF content snapshot` message and push to `main`. The job has no secrets; it only needs `contents: write` permission. If the sync command exits non-zero, the job fails and no commit is made.

- [ ] **Step 3: Document operation**

`docs/content-sync.md`: what the snapshot is, the section list, `npm run content:sync` flags (`--sections`, `--dry-run`, `--json`), how the scheduled workflow refreshes and deploys it, how to do a manual full refresh and recover from a bad run (revert the snapshot commit), the source-policy exclusions, and the GLC host scope. No credentials — there are none.

- [ ] **Step 4: Run all gates**

~~~powershell
npm run test:content
npm run lint
npm run typecheck
npm run build
~~~

Expected: all commands pass, aside from separately documented unrelated dirty-checkout failures.

- [ ] **Step 5: Run browser verification against one isolated server**

Start one dev or production server, run node src/app/grow/resources/resources.e2e.test.mjs, and stop it before invoking another Next command. Never run next dev and next build concurrently against .next.

- [ ] **Step 6: Commit verification artifacts**

~~~powershell
git add src/app/grow/resources/resources.e2e.test.mjs docs/content-sync.md .github/workflows/content-sync.yml
git commit -m "test: verify synchronized content and add the scheduled sync workflow"
~~~

### Task 8: Parse and publish the GLC class catalogue

**Files:**
- Create: src/lib/content/parsers/glc.ts
- Create: src/lib/content/parsers/glc.test.ts
- Create: src/lib/content/__fixtures__/glc-library.html
- Create: src/lib/content/__fixtures__/glc-class.html
- Modify: src/lib/content/types.ts (GlcClassRecord already defined in Task 1 — extend if needed)
- Modify: src/lib/content/sync.ts
- Modify: src/lib/content/snapshot.ts
- Modify: scripts/seed-content-snapshot.ts
- Modify: src/data/generated/public-content.json
- Modify: src/lib/queries.ts
- Modify: src/lib/types.ts
- Modify: src/app/grow/glc/page.tsx
- Test: src/lib/content/glc-queries.test.ts

**Interfaces:**
- Produces: parseGlcLibrary(html, source, observedAt), parseGlcClassPage(html, source, observedAt), and getGlcClasses(category?): Promise<GlcClassRecord[]>. (GlcClassRecord is already in types.ts from Task 1.)

- [ ] **Step 1: Extract minimal fixtures from glc.ccf.org.ph**

From the published GLC library index keep only the category headings (GLC 1 EDIFY, GLC 2 EQUIP, GLC 3 EMPOW, Apologetics, Biblical Foundations, Book Studies, Discipleship, Engage, Evangelism, Leadership, Theology and Bible) and one class link each. From one class page keep the title, description paragraph, delivery-format labels, and any workbook/materials download anchor. Exclude global navigation, cart, forms, and scripts.

- [ ] **Step 2: Write failing parser and query tests**

~~~ts
test("groups classes under their GLC library category", () => {
  const result = parseGlcLibrary(input("glc-library.html"));
  const edify = result.records.filter((r) => r.category === "GLC 1 EDIFY");
  assert.ok(edify.length > 0);
  assert.match(edify[0].sourceUrl, /^https:\/\/glc\.ccf\.org\.ph\//);
  assert.ok(edify[0].trackKey.length > 0);
});

test("class page keeps description and delivery formats without guessing", () => {
  const result = parseGlcClassPage(input("glc-class.html"));
  assert.ok(result.record.description);
  assert.deepEqual(
    [...result.record.formats].sort(),
    ["e-learning", "face-to-face"],
  );
});

test("getGlcClasses filters by category", async () => {
  const rows = await getGlcClasses("Theology and Bible");
  assert.ok(rows.every((r) => r.category === "Theology and Bible"));
});
~~~

- [ ] **Step 3: Run and confirm failure**

Run: npm run test:content -- src/lib/content/parsers/glc.test.ts src/lib/content/glc-queries.test.ts

Expected: FAIL because the GLC parser, store methods, and query are absent.

- [ ] **Step 4: Implement the parser, snapshot section, sync scope, and query**

Add a `glcClasses` section to `ContentSnapshot` and its `validateSection` case (non-empty `trackKey`, known `category`). Add the GLC library index URL to the sync's default section list so a scheduled run refreshes it, using checksum skips and concurrency of three. `parseGlcLibrary` reads the category groupings and one record per class link; `parseGlcClassPage` fills description and delivery formats. Resolve class and workbook links against `https://glc.ccf.org.ph/`. Emit warnings, never guesses, for missing category, title, or formats. Teach `seed-content-snapshot.ts` to include `glcClasses`.

- [ ] **Step 5: Build the /grow/glc catalogue page**

Replace the placeholder with a server-rendered catalogue grouped by category in the fixed order above, using existing PageHeader, Section, Container, Pill, and EmptyState primitives. Each class shows title, description, format Pills, a real anchor to its glc.ccf.org.ph page (labeled as an external CCF property), and a workbook download anchor when present. Show EmptyState per category when a category has no published classes. `getGlcClasses` reads the snapshot and returns an empty list (not seed data) when the section is absent.

- [ ] **Step 6: Validate and commit**

~~~powershell
npm run test:content -- src/lib/content/parsers/glc.test.ts src/lib/content/glc-queries.test.ts
npm run lint -- src/app/grow/glc src/lib/content src/lib/queries.ts
npm run typecheck
git add src/lib/content/parsers/glc.ts src/lib/content/parsers/glc.test.ts src/lib/content/__fixtures__/glc-library.html src/lib/content/__fixtures__/glc-class.html src/lib/content/types.ts src/lib/content/sync.ts src/lib/content/snapshot.ts scripts/seed-content-snapshot.ts src/data/generated/public-content.json src/lib/queries.ts src/lib/types.ts src/app/grow/glc/page.tsx src/lib/content/glc-queries.test.ts
git commit -m "feat: publish the GLC class catalogue"
~~~

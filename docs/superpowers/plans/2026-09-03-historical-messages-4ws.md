# Historical Messages and 4Ws Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import CCF's historical message and 4Ws catalogue into the existing searchable teaching experience without losing distinct editions or inventing relationships.

**Architecture:** Extend the shared content synchronizer and the committed snapshot with `messages`, `series`, `speakers`, `fourWs`, and `messageRelations` sections carrying upstream identity and edition metadata. Parse sermon, speaker, series, and 4Ws pages into typed records, rewrite each section atomically, and preserve src/lib/queries.ts as the only page-facing data seam. No database.

**Tech Stack:** Next.js 16.3.4, React 19, TypeScript, Cheerio, sanitize-html, Node test runner through tsx

**Spec:** docs/superpowers/specs/2026-09-03-live-content-sync-design.md

## Global Constraints

- Complete docs/superpowers/plans/2026-09-03-content-sync-foundation-resources.md first.
- Preserve distinct AM, PM, full-message, Runthrough, Fast Track, and translated editions.
- Publish relationships only when the source explicitly links them or a deterministic upstream identity proves them.
- Never infer speakers, Scripture passages, dates, or media identifiers from title similarity alone.
- Preserve all unrelated dirty work and stage only files owned by the active task.

---

## File map

- src/lib/content/teaching-normalize.ts: edition identity and explicit relations.
- src/lib/content/parsers/teaching.ts: sermon, speaker, and series parsing.
- src/lib/content/parsers/four-ws.ts: structured 4Ws parsing.
- src/lib/content/sync.ts: teaching synchronization scope.
- src/lib/content/snapshot.ts: teaching sections read/written in the committed snapshot.
- src/lib/content/snapshot.ts: teaching sections and their validation added to ContentSnapshot.
- src/lib/queries.ts: repository-backed teaching queries.
- src/app/watch/messages/page.tsx: historical filters and pagination.
- src/app/watch/messages/[slug]/page.tsx: companion and source details.
- src/app/watch/4ws/page.tsx: working guides and PDFs.
- src/app/page.tsx: homepage "Take it further" rail rendering the live 4Ws.

### Task 1: Model provenance, editions, and relations

**Files:**
- Modify: src/lib/content/types.ts
- Create: src/lib/content/teaching-normalize.ts
- Test: src/lib/content/teaching-normalize.test.ts
- Modify: src/lib/content/snapshot.ts

**Interfaces:**
- Produces: TeachingEdition, ImportedMessage, ImportedFourWs, messageSourceKey(record), and buildExplicitRelations(records).

- [ ] **Step 1: Write failing identity tests**

~~~ts
test("keeps AM and PM Runthrough editions distinct", () => {
  const am = messageSourceKey(record({
    wordpressId: 41831,
    serviceEdition: "AM",
    format: "runthrough",
  }));
  const pm = messageSourceKey(record({
    wordpressId: 41832,
    serviceEdition: "PM",
    format: "runthrough",
  }));
  assert.notEqual(am, pm);
});

test("does not publish a title-only companion match", () => {
  assert.deepEqual(
    buildExplicitRelations([unlinkedMain, similarlyNamedRunthrough]),
    [],
  );
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/teaching-normalize.test.ts

Expected: FAIL because the normalization module is absent.

- [ ] **Step 3: Implement contracts and snapshot sections**

Add `sourceUrl`, `wordpressId`, `sourceModifiedAt`, `serviceEdition`, `format`, `language`, `checksum`, and `warnings` to the message and 4Ws record types. Add a `messageRelations` array (`fromKey`, `toKey`, `relationKind`, `evidenceUrl`) with a de-dup key. Extend `ContentSnapshot` with `messages`, `series`, `speakers`, `fourWs`, and `messageRelations` sections and their `validateSection` cases.

- [ ] **Step 4: Run the focused test**

Run: npm run test:content -- src/lib/content/teaching-normalize.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/content/types.ts src/lib/content/teaching-normalize.ts src/lib/content/teaching-normalize.test.ts src/lib/content/snapshot.ts
git commit -m "feat: model historical teaching editions"
~~~

### Task 2: Parse sermons, speakers, series, and 4Ws

**Files:**
- Create: src/lib/content/parsers/teaching.ts
- Create: src/lib/content/parsers/four-ws.ts
- Create: src/lib/content/parsers/teaching.test.ts
- Create: src/lib/content/parsers/four-ws.test.ts
- Create: src/lib/content/__fixtures__/sermon.html
- Create: src/lib/content/__fixtures__/sermon-runthrough.html
- Create: src/lib/content/__fixtures__/speaker-archive.html
- Create: src/lib/content/__fixtures__/series-archive.html
- Create: src/lib/content/__fixtures__/four-ws.html

**Interfaces:**
- Produces: parseSermonPage, parseSpeakerArchive, parseSeriesArchive, and parseFourWsPage.

- [ ] **Step 1: Create minimal fixtures from the authorized corpus**

Include lazy-loaded embed data-src, exact title, date, author or speaker link, categories, tags, Other Resources links, and one structured 4Ws sequence. Keep only DOM needed by the assertions.

- [ ] **Step 2: Write failing parser tests**

~~~ts
test("reads the real lazy-loaded video URL", () => {
  const parsed = parseSermonPage(fixture("sermon-runthrough.html"));
  assert.equal(parsed.message.videoUrl, "https://www.youtube.com/embed/example-id");
  assert.equal(parsed.message.format, "runthrough");
  assert.equal(parsed.message.serviceEdition, "PM");
});

test("preserves all four 4Ws sections", () => {
  const parsed = parseFourWsPage(fixture("four-ws.html"));
  assert.ok(parsed.guide.welcomeHtml);
  assert.ok(parsed.guide.worshipHtml);
  assert.ok(parsed.guide.wordHtml);
  assert.ok(parsed.guide.worksHtml);
});
~~~

- [ ] **Step 3: Run and confirm failure**

Run: npm run test:content -- src/lib/content/parsers/teaching.test.ts src/lib/content/parsers/four-ws.test.ts

Expected: FAIL because the parser modules are absent.

- [ ] **Step 4: Implement parsers**

Read data-src before placeholder src; preserve exact titles and raw dates; normalize AM, PM, and format only from explicit tokens; collect labeled Other Resources; sanitize body sections; and return warnings rather than guesses for absent metadata.

- [ ] **Step 5: Test and commit**

~~~powershell
npm run test:content -- src/lib/content/parsers/teaching.test.ts src/lib/content/parsers/four-ws.test.ts
git add src/lib/content/parsers/teaching.ts src/lib/content/parsers/four-ws.ts src/lib/content/parsers/teaching.test.ts src/lib/content/parsers/four-ws.test.ts src/lib/content/__fixtures__
git commit -m "feat: parse historical messages and 4Ws"
~~~

### Task 3: Synchronize the historical catalogue into the snapshot

**Files:**
- Modify: src/lib/content/sync.ts
- Modify: src/lib/content/snapshot.ts
- Modify: scripts/sync-ccf-content.ts
- Modify: scripts/seed-content-snapshot.ts
- Modify: src/data/generated/public-content.json
- Test: src/lib/content/teaching-sync.test.ts

**Interfaces:**
- Produces: a `teaching` section group in `runContentSync` (messages, series, speakers, fourWs, messageRelations).

- [ ] **Step 1: Write failing idempotency and retention tests**

~~~ts
test("a second identical sync performs no writes", async () => {
  await runContentSync(teachingHarness());
  const before = readFileSync(SNAPSHOT_PATH, "utf8");
  await runContentSync(teachingHarness());
  assert.equal(readFileSync(SNAPSHOT_PATH, "utf8"), before);
});

test("a malformed sermon cannot erase the published archive", async () => {
  const prior = readSnapshot().messages;
  const summary = await runContentSync(teachingHarnessWithMalformedRecord());
  assert.match(summary.sections.messages.error ?? "", /identity/);
  assert.deepEqual(readSnapshot().messages, prior);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/teaching-sync.test.ts

Expected: FAIL because teaching synchronization is absent.

- [ ] **Step 3: Implement sitemap-driven teaching sync**

Process both sermon sitemaps, speaker and series taxonomies, and approved 4Ws pages as sync sections. Use lastmod and checksums to skip unchanged records, maximum concurrency of three, atomic per-section snapshot rewrites, stable source keys, and explicit relation evidence only. A section that fails validation keeps its prior records and records the error. Record source 404s without deleting historical records.

- [ ] **Step 4: Refresh the teaching sections of the seed snapshot**

~~~powershell
npx tsx scripts/seed-content-snapshot.ts --input docs/research/ccf-site-scrape-2026-09-03/content.jsonl --output src/data/generated/public-content.json --sections teaching
~~~

Expected: stable sorted output with normalized teaching fields and no raw crawl envelopes.

- [ ] **Step 5: Validate and commit**

~~~powershell
npm run test:content -- src/lib/content/teaching-sync.test.ts
npm run typecheck
git add src/lib/content/sync.ts src/lib/content/snapshot.ts scripts/sync-ccf-content.ts scripts/seed-content-snapshot.ts src/data/generated/public-content.json src/lib/content/teaching-sync.test.ts
git commit -m "feat: synchronize historical teaching catalogue"
~~~

### Task 4: Move teaching queries behind the snapshot

**Files:**
- Modify: src/lib/queries.ts
- Modify: src/lib/types.ts
- Test: src/lib/content/teaching-queries.test.ts

**Interfaces:**
- Preserves: getMessages, findMessages, getMessage, getSeries, getSpeakers, and getFourWs.
- Adds: optional format, service, language, page, and pageSize filters.

- [ ] **Step 1: Write the failing compatibility test**

~~~ts
test("historical messages are searchable by speaker, year, and format", async () => {
  const rows = await findMessages({
    speaker: "peter-tanchi",
    year: "2026",
    format: "runthrough",
  });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.speaker?.slug === "peter-tanchi"));
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/teaching-queries.test.ts

Expected: FAIL because format filtering and content-store reads are absent.

- [ ] **Step 3: Implement repository-backed teaching queries**

Keep existing signatures compatible. Read the snapshot's teaching sections; fall back to the current seed data per section when it is empty. Let getRelatedMessages prefer explicit relations before same-series and shared-topic scoring.

- [ ] **Step 4: Test and typecheck**

~~~powershell
npm run test:content -- src/lib/content/teaching-queries.test.ts
npm run typecheck
~~~

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/queries.ts src/lib/types.ts src/lib/content/teaching-queries.test.ts
git commit -m "refactor: read teaching from synchronized content"
~~~

### Task 5: Expose the complete message and 4Ws archives

**Files:**
- Modify: src/app/watch/messages/page.tsx
- Modify: src/app/watch/messages/filters.tsx
- Modify: src/app/watch/messages/[slug]/page.tsx
- Modify: src/app/watch/4ws/page.tsx
- Modify: src/app/page.tsx
- Create: src/app/watch/4ws/links.test.ts
- Create: src/app/four-ws-live.test.ts
- Create: src/app/watch/messages/messages.e2e.test.mjs

**Interfaces:**
- Produces: URL-backed edition and language filters, semantic pagination, explicit companion links, working 4Ws PDFs, and the homepage plus message-detail 4Ws blocks rendering the live current-week guide.

- [ ] **Step 1: Add the failing PDF-link regression test**

~~~ts
test("4Ws uses an anchor for an available PDF", () => {
  const source = readFileSync("src/app/watch/4ws/page.tsx", "utf8");
  assert.match(source, /href=\{w\.pdf_url\}/);
  assert.doesNotMatch(source, /<button[\s\S]*?>\s*PDF/);
});
~~~

- [ ] **Step 2: Add the failing live-4Ws test**

~~~ts
test("homepage 4Ws rail has no hardcoded movement descriptions", () => {
  const source = readFileSync("src/app/page.tsx", "utf8");
  assert.doesNotMatch(source, /An opening question that gets everyone talking/);
  assert.doesNotMatch(source, /const FOUR_WS = \[/);
});

test("message detail renders the synced 4Ws guide body and official PDF", () => {
  const source = readFileSync("src/app/watch/messages/[slug]/page.tsx", "utf8");
  assert.match(source, /four_ws/);
  assert.match(source, /pdf_url|guideUrl/);
});
~~~

- [ ] **Step 3: Run and confirm failure**

Run: npm run test:content -- src/app/watch/4ws/links.test.ts src/app/four-ws-live.test.ts

Expected: FAIL against the current inert PDF button and the hardcoded FOUR_WS array.

- [ ] **Step 4: Implement archive UI changes and the live 4Ws blocks**

Add format, service, language, and year query parameters; total count and real pagination; unobtrusive source and update details; explicit companion links only; and accessible PDF, audio, and video anchors.

Replace the hardcoded `FOUR_WS` array in `src/app/page.tsx` and the `#four-ws` section of `src/app/watch/messages/[slug]/page.tsx` with the synced guide for the latest message: render the actual welcome question, the passage, the Word questions, and the works step from `latest.four_ws` (sanitized HTML sections), and point "Get the guide" / "Get the 4Ws guide" at the record's official CCF PDF URL. When the latest message has no published guide yet, fall back to a single short generic sentence — not a four-line breakdown — and keep the button pointing at `/watch/messages/[slug]#four-ws`.

- [ ] **Step 5: Run focused and browser checks**

~~~powershell
npm run test:content
npm run lint -- src/app/watch src/app/page.tsx src/lib/queries.ts src/lib/content
npm run typecheck
node src/app/watch/messages/messages.e2e.test.mjs
~~~

The browser flow covers mobile and desktop filters, pagination, message detail, companion links, one 4Ws guide/PDF destination, the homepage rail showing the live current-week guide, and zero console errors.

- [ ] **Step 6: Commit**

~~~powershell
git add src/app/watch/messages src/app/watch/4ws src/app/page.tsx src/app/four-ws-live.test.ts
git commit -m "feat: publish historical messages and live 4Ws"
~~~

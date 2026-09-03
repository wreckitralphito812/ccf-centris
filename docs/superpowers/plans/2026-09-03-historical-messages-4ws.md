# Historical Messages and 4Ws Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import CCF's historical message and 4Ws catalogue into the existing searchable teaching experience without losing distinct editions or inventing relationships.

**Architecture:** Extend the shared content synchronizer and existing teaching tables with upstream identity and edition metadata. Parse sermon, speaker, series, and 4Ws pages into typed records, publish complete batches atomically, and preserve src/lib/queries.ts as the only page-facing data seam.

**Tech Stack:** Next.js 16.3.4, React 19, TypeScript, Supabase, Cheerio, sanitize-html, Node test runner through tsx

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
- src/lib/content/store.ts: teaching persistence and fallback reads.
- supabase/migrations/0004_teaching_provenance.sql: upstream fields and relations.
- src/lib/queries.ts: repository-backed teaching queries.
- src/app/watch/messages/page.tsx: historical filters and pagination.
- src/app/watch/messages/[slug]/page.tsx: companion and source details.
- src/app/watch/4ws/page.tsx: working guides and PDFs.

### Task 1: Model provenance, editions, and relations

**Files:**
- Modify: src/lib/content/types.ts
- Create: src/lib/content/teaching-normalize.ts
- Test: src/lib/content/teaching-normalize.test.ts
- Create: supabase/migrations/0004_teaching_provenance.sql

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

- [ ] **Step 3: Implement contracts and migration**

Add source URL, WordPress ID, source-modified time, service edition, content format, language, publication generation, checksum, and warnings to messages and four_ws. Add message_relations with from_message_id, to_message_id, relation_kind, and evidence_url; enforce a unique composite key and public reads.

- [ ] **Step 4: Run the focused test**

Run: npm run test:content -- src/lib/content/teaching-normalize.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/content/types.ts src/lib/content/teaching-normalize.ts src/lib/content/teaching-normalize.test.ts supabase/migrations/0004_teaching_provenance.sql
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

### Task 3: Synchronize the historical catalogue atomically

**Files:**
- Modify: src/lib/content/sync.ts
- Modify: src/lib/content/store.ts
- Modify: scripts/sync-ccf-content.ts
- Modify: scripts/build-content-fallback.ts
- Modify: src/data/generated/public-content.json
- Test: src/lib/content/teaching-sync.test.ts

**Interfaces:**
- Produces: syncTeachingCatalogue(context): Promise<SyncSummary> and teaching methods on ContentStore.

- [ ] **Step 1: Write failing idempotency and retention tests**

~~~ts
test("a second identical sync performs no writes", async () => {
  const first = await syncTeachingCatalogue(harness);
  const second = await syncTeachingCatalogue(harness);
  assert.ok(first.counts.inserted > 0);
  assert.equal(second.counts.inserted + second.counts.updated, 0);
});

test("a malformed sermon cannot erase the published archive", async () => {
  await assert.rejects(() =>
    syncTeachingCatalogue(harnessWithMalformedRecord),
  );
  assert.equal((await store.listMessages({})).length, originalCount);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/lib/content/teaching-sync.test.ts

Expected: FAIL because teaching synchronization is absent.

- [ ] **Step 3: Implement sitemap-driven teaching sync**

Process both sermon sitemaps, speaker and series taxonomies, and approved 4Ws pages. Use lastmod and checksums to skip unchanged records, maximum concurrency of three, atomic generations, stable source keys, and explicit relation evidence. Record source 404s without automatically deleting historical records.

- [ ] **Step 4: Refresh the teaching fallback**

~~~powershell
npx tsx scripts/build-content-fallback.ts --input docs/research/ccf-site-scrape-2026-09-03/content.jsonl --output src/data/generated/public-content.json --include teaching
~~~

Expected: stable sorted output with normalized teaching fields and no raw crawl envelopes.

- [ ] **Step 5: Validate and commit**

~~~powershell
npm run test:content -- src/lib/content/teaching-sync.test.ts
npm run typecheck
git add src/lib/content/sync.ts src/lib/content/store.ts scripts/sync-ccf-content.ts scripts/build-content-fallback.ts src/data/generated/public-content.json src/lib/content/teaching-sync.test.ts
git commit -m "feat: synchronize historical teaching catalogue"
~~~

### Task 4: Move teaching queries behind the content store

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

Keep existing signatures compatible. Use the current seed only through the fallback store. Let getRelatedMessages prefer explicit relations before same-series and shared-topic scoring.

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
- Create: src/app/watch/4ws/links.test.ts
- Create: src/app/watch/messages/messages.e2e.test.mjs

**Interfaces:**
- Produces: URL-backed edition and language filters, semantic pagination, explicit companion links, and working 4Ws PDFs.

- [ ] **Step 1: Add the failing PDF-link regression test**

~~~ts
test("4Ws uses an anchor for an available PDF", () => {
  const source = readFileSync("src/app/watch/4ws/page.tsx", "utf8");
  assert.match(source, /href=\{w\.pdf_url\}/);
  assert.doesNotMatch(source, /<button[\s\S]*?>\s*PDF/);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: npm run test:content -- src/app/watch/4ws/links.test.ts

Expected: FAIL against the current inert PDF button.

- [ ] **Step 3: Implement archive UI changes**

Add format, service, language, and year query parameters; total count and real pagination; unobtrusive source and update details; explicit companion links only; and accessible PDF, audio, and video anchors.

- [ ] **Step 4: Run focused and browser checks**

~~~powershell
npm run test:content
npm run lint -- src/app/watch src/lib/queries.ts src/lib/content
npm run typecheck
node src/app/watch/messages/messages.e2e.test.mjs
~~~

The browser flow covers mobile and desktop filters, pagination, message detail, companion links, one 4Ws guide/PDF destination, and zero console errors.

- [ ] **Step 5: Commit**

~~~powershell
git add src/app/watch/messages src/app/watch/4ws
git commit -m "feat: publish historical messages and 4Ws"
~~~

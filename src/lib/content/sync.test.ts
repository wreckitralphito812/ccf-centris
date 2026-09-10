import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PARSER_VERSION, runContentSync } from "./sync";
import { emptySnapshot, readSnapshotFrom, writeSnapshotTo } from "./snapshot";

const CHRONICLE_HTML = readFileSync(
  join(__dirname, "__fixtures__", "chronicle.html"),
  "utf8",
);

function tmpSnapshot(): string {
  const path = join(mkdtempSync(join(tmpdir(), "ccf-sync-")), "public-content.json");
  writeSnapshotTo(path, emptySnapshot());
  return path;
}

/** A fetch stub that serves the Chronicle fixture and 304s everything else. */
function harness(overrides: { status?: number; body?: string } = {}) {
  const status = overrides.status ?? 200;
  return {
    snapshotPath: tmpSnapshot(),
    sections: ["chronicleIssues" as const],
    now: () => "2026-09-04T00:00:00.000Z",
    fetchImpl: async (url: string) => {
      if (status === 304) return new Response(null, { status: 304 });
      if (url.includes("/chronicle/")) {
        return new Response(overrides.body ?? CHRONICLE_HTML, {
          status: 200,
          headers: { "content-type": "text/html", etag: '"v1"' },
        });
      }
      return new Response(null, { status: 304 });
    },
  };
}

test("a fresh run inserts parsed records into the snapshot", async () => {
  const h = harness();
  const summary = await runContentSync(h);
  const chronicle = summary.sections.chronicleIssues!;
  assert.ok(chronicle.inserted > 0);
  assert.equal(chronicle.error, null);
  const snap = readSnapshotFrom(h.snapshotPath);
  assert.equal(snap.chronicleIssues[0].downloadId, "41950");
});

test("a 304 response skips the section and writes nothing", async () => {
  const h = harness({ status: 304 });
  const before = readFileSync(h.snapshotPath, "utf8");
  const summary = await runContentSync(h);
  assert.deepEqual(summary.sections.chronicleIssues, {
    inserted: 0,
    updated: 0,
    skipped: 1,
    dropped: 0,
    error: null,
  });
  assert.equal(readFileSync(h.snapshotPath, "utf8"), before);
});

test("a second run with the same upstream writes a byte-identical file", async () => {
  const h = harness();
  await runContentSync(h);
  const after1 = readFileSync(h.snapshotPath, "utf8");
  // second run: same path, same fixture
  await runContentSync({ ...harness(), snapshotPath: h.snapshotPath });
  assert.equal(readFileSync(h.snapshotPath, "utf8"), after1);
});

test("a section that fails validation keeps prior records and reports the error", async () => {
  // Seed a good record, then feed malformed HTML (no download links).
  const h = harness({ body: "<main><div class='entry-content'><h2>Series</h2><p>no links</p></div></main>" });
  const good = await runContentSync(harness());
  writeSnapshotTo(h.snapshotPath, readSnapshotFrom(good.snapshotPath));
  const prior = readSnapshotFrom(h.snapshotPath).chronicleIssues;
  assert.ok(prior.length > 0);

  const summary = await runContentSync({ ...h });
  // No records parsed -> section considered empty -> treated as a drop, prior kept.
  assert.deepEqual(readSnapshotFrom(h.snapshotPath).chronicleIssues, prior);
  assert.equal(summary.sections.chronicleIssues!.inserted, 0);
});

/** A snapshot holding one 4Ws week and its guide, parsed by `parserVersion`. */
function guideSnapshot(parserVersion: string) {
  const url = "https://www.ccf.org.ph/4ws-love-god-goviral-edition/";
  const source = {
    sourceUrl: url,
    canonicalUrl: url,
    resolvedUrl: url,
    sourceModifiedAt: null,
    fetchedAt: "2026-09-01T00:00:00.000Z",
    checksum: "prior",
    parserVersion,
  };
  const snap = emptySnapshot();
  snap.fourWsWeeks = [
    {
      kind: "four_ws_week",
      slug: "4ws-love-god",
      title: "Love God",
      seriesTitle: null,
      year: 2026,
      serviceDateLabel: "Sep 5 and 6",
      serviceDate: "2026-09-06",
      standardUrl: "https://www.ccf.org.ph/4ws-love-god/",
      goViralUrl: url,
      source,
    },
  ];
  snap.fourWsGuides = [
    {
      kind: "four_ws_guide",
      slug: "4ws-love-god",
      title: "LOVE GOD",
      dateLabel: null,
      date: null,
      welcome: null,
      worshipSongs: [],
      word: null,
      works: null,
      prayCareShare: null,
      prayerPoints: [],
      memoryVerseReference: null,
      memoryVerseText: null,
      source,
    },
  ];
  const snapshotPath = join(mkdtempSync(join(tmpdir(), "ccf-sync-")), "public-content.json");
  writeSnapshotTo(snapshotPath, snap);
  return { snapshotPath, url };
}

test("a guide parsed by an older parser is fetched again and updated", async () => {
  const { snapshotPath, url } = guideSnapshot("0.9.0");
  const summary = await runContentSync({
    snapshotPath,
    sections: ["fourWsGuides"],
    now: () => "2026-09-10T00:00:00.000Z",
    fetchImpl: async (u: string) =>
      u === url
        ? new Response(
            '<html><body><h1>LOVE GOD</h1><a href ="https://www.ccf.org.ph/download/41972/" download>PDF</a></body></html>',
            { status: 200, headers: { "content-type": "text/html" } },
          )
        : new Response(null, { status: 404 }),
  });

  assert.equal(summary.sections.fourWsGuides?.updated, 1);
  assert.equal(summary.sections.fourWsGuides?.inserted, 0);
  const [guide] = readSnapshotFrom(snapshotPath).fourWsGuides;
  assert.equal(guide?.downloadUrl, "https://www.ccf.org.ph/download/41972/");
  assert.equal(guide?.source.parserVersion, PARSER_VERSION);
});

test("a guide from the current parser is not fetched again", async () => {
  const { snapshotPath } = guideSnapshot(PARSER_VERSION);
  let fetches = 0;
  const summary = await runContentSync({
    snapshotPath,
    sections: ["fourWsGuides"],
    now: () => "2026-09-10T00:00:00.000Z",
    fetchImpl: async () => {
      fetches++;
      return new Response(null, { status: 404 });
    },
  });

  assert.equal(fetches, 0);
  assert.equal(summary.sections.fourWsGuides?.skipped, 1);
});

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runContentSync } from "./sync";
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

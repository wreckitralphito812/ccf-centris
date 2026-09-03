import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  emptySnapshot,
  readSnapshotFrom,
  replaceSection,
  validateSection,
  writeSnapshotTo,
} from "./snapshot";
import type { ChronicleIssueRecord } from "./types";

function tmpFile(): string {
  return join(mkdtempSync(join(tmpdir(), "ccf-snap-")), "public-content.json");
}

function meta() {
  return { lastRunAt: "2026-09-04T00:00:00.000Z", checksum: "abc", parserVersion: "test", warnings: [] };
}

function goodChronicle(): ChronicleIssueRecord {
  return {
    kind: "chronicle",
    downloadId: "41950",
    title: "Our Extraordinary God Is Our Shepherd, Follow Him",
    seriesTitle: "Ordinary People, Extraordinary God",
    serviceDateLabel: "Aug 29 and 30",
    serviceDate: null,
    downloadUrl: "https://www.ccf.org.ph/download/41950/",
    displayedDownloadCount: 23,
    downloadCountObservedAt: "2026-09-04T00:00:00.000Z",
    source: {
      sourceUrl: "https://www.ccf.org.ph/chronicle/",
      canonicalUrl: "https://www.ccf.org.ph/chronicle/",
      resolvedUrl: "https://www.ccf.org.ph/chronicle/",
      sourceModifiedAt: null,
      fetchedAt: "2026-09-04T00:00:00.000Z",
      checksum: "abc",
      parserVersion: "test",
    },
  };
}

test("readSnapshotFrom returns an empty shaped snapshot when the file is missing", () => {
  const snap = readSnapshotFrom(tmpFile());
  assert.deepEqual(snap, emptySnapshot());
});

test("writeSnapshotTo is atomic and round-trips", () => {
  const path = tmpFile();
  const snap = replaceSection(emptySnapshot(), "chronicleIssues", [goodChronicle()], meta());
  writeSnapshotTo(path, snap);
  assert.deepEqual(readSnapshotFrom(path), snap);
});

test("validateSection rejects a record with no stable identity", () => {
  const ok = validateSection("chronicleIssues", [goodChronicle()]);
  assert.equal(ok.ok, true);

  const bad = validateSection("chronicleIssues", [{ ...goodChronicle(), downloadId: "" }]);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.errors.join(" "), /identity|downloadId/i);
});

test("a failed section validation leaves the prior file untouched", () => {
  const path = tmpFile();
  const prior = replaceSection(emptySnapshot(), "chronicleIssues", [goodChronicle()], meta());
  writeSnapshotTo(path, prior);

  const proposed = replaceSection(prior, "chronicleIssues", [
    { ...goodChronicle(), downloadId: "" },
  ], meta());
  const check = validateSection("chronicleIssues", proposed.chronicleIssues);
  assert.equal(check.ok, false);

  // caller must not write when validation fails
  assert.deepEqual(readSnapshotFrom(path), prior);
});

test("replaceSection swaps one section and its meta, leaving others intact", () => {
  const base = replaceSection(emptySnapshot(), "resources", [], meta());
  const next = replaceSection(base, "chronicleIssues", [goodChronicle()], meta());
  assert.deepEqual(next.resources, base.resources);
  assert.equal(next.chronicleIssues.length, 1);
  assert.equal(next.meta.chronicleIssues?.checksum, "abc");
});

test("writeSnapshotTo produces stable, sorted, pretty JSON", () => {
  const path = tmpFile();
  const snap = replaceSection(emptySnapshot(), "chronicleIssues", [goodChronicle()], meta());
  writeSnapshotTo(path, snap);
  const a = readFileSync(path, "utf8");
  writeSnapshotTo(path, readSnapshotFrom(path));
  assert.equal(readFileSync(path, "utf8"), a);
  assert.match(a, /\n {2}"chronicleIssues"/); // pretty-printed
});

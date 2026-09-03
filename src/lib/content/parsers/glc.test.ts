import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseGlcLibrary } from "./glc";

const OBSERVED_AT = "2026-09-04T00:00:00.000Z";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "..", "__fixtures__", name), "utf8");
}

const src = {
  sourceUrl: "https://glc.ccf.org.ph/",
  canonicalUrl: "https://glc.ccf.org.ph/",
  resolvedUrl: "https://glc.ccf.org.ph/",
  sourceModifiedAt: null,
  fetchedAt: OBSERVED_AT,
  checksum: "test",
  parserVersion: "test",
};

test("parses all 11 GLC library categories with stable track keys", () => {
  const { records } = parseGlcLibrary(fixture("glc-library.html"), src, OBSERVED_AT);
  assert.equal(records.length, 11);
  const categories = records.map((r) => r.category);
  assert.deepEqual(categories, [
    "GLC 1 EDIFY",
    "GLC 2 EQUIP",
    "GLC 3 EMPOW",
    "Apologetics",
    "Biblical Foundations",
    "Book Studies",
    "Discipleship",
    "Engage",
    "Evangelism",
    "Leadership",
    "Theology and Bible",
  ]);
});

test("each class links out to glc.ccf.org.ph and carries a track key", () => {
  const { records } = parseGlcLibrary(fixture("glc-library.html"), src, OBSERVED_AT);
  const bf = records.find((r) => r.category === "Biblical Foundations");
  assert.ok(bf);
  assert.equal(bf?.trackKey, "biblical-foundations");
  assert.equal(bf?.source.sourceUrl, "https://glc.ccf.org.ph/biblical-foundations/");
  assert.equal(bf?.active, true);
});

test("delivery formats are captured from the page's global list", () => {
  const { records } = parseGlcLibrary(fixture("glc-library.html"), src, OBSERVED_AT);
  const g1 = records[0];
  assert.deepEqual(
    [...g1.formats].sort(),
    ["dgroup", "e-learning", "face-to-face", "zoom"],
  );
});

test("records validate against the snapshot's glcClasses rules", () => {
  const { records } = parseGlcLibrary(fixture("glc-library.html"), src, OBSERVED_AT);
  for (const r of records) {
    assert.ok(r.trackKey.length > 0);
    assert.ok(r.title.length > 0);
    assert.equal(typeof r.sortOrder, "number");
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import { getGlcCatalogue, getGlcCatalogueGroups } from "./public-queries";

// getGlcCatalogue reads the real committed snapshot; after a sync it holds the
// 11 GLC library categories. These tests assert the shape and grouping.

test("getGlcCatalogue returns active classes sorted by the fixed category order", async () => {
  const rows = await getGlcCatalogue();
  if (rows.length === 0) return; // snapshot not synced in this environment
  assert.ok(rows.every((c) => c.active));
  const orders = rows.map((c) => c.sortOrder);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.ok(rows.every((c) => c.source.sourceUrl.startsWith("https://glc.ccf.org.ph/")));
});

test("getGlcCatalogue can filter to one category", async () => {
  const all = await getGlcCatalogue();
  if (all.length === 0) return;
  const cat = all[0].category;
  const filtered = await getGlcCatalogue(cat);
  assert.ok(filtered.every((c) => c.category === cat));
});

test("getGlcCatalogueGroups groups by category preserving order", async () => {
  const groups = await getGlcCatalogueGroups();
  if (groups.length === 0) return;
  const cats = groups.map((g) => g.category);
  assert.deepEqual(cats, [...new Set(cats)]); // no category repeated
  assert.ok(groups.every((g) => g.classes.length > 0));
});

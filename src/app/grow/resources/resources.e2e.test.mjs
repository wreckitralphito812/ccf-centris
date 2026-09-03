/**
 * Route smoke test for the synchronized-content pages. Assumes a server is
 * already running at BASE (default http://localhost:3199):
 *
 *   npx next build && npx next start -p 3199 &
 *   node src/app/grow/resources/resources.e2e.test.mjs
 *
 * Never run `next dev` and `next build` against .next at the same time.
 */

import assert from "node:assert/strict";
import test from "node:test";

const BASE = process.env.BASE ?? "http://localhost:3199";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.text();
  return { status: res.status, body };
}

test("Resources renders the grid and an official external download", async () => {
  const { status, body } = await get("/grow/resources");
  assert.equal(status, 200);
  assert.match(body, /<title>Resources/);
  assert.match(body, /Open on ccf\.org\.ph/);
});

test("Resources honours a text filter in the URL", async () => {
  const { status, body } = await get("/grow/resources?q=jesus");
  assert.equal(status, 200);
  assert.match(body, /real Jesus/i);
});

test("Chronicle groups by series and dates every issue", async () => {
  const { status, body } = await get("/grow/resources/chronicle");
  assert.equal(status, 200);
  assert.match(body, /Ordinary People, Extraordinary God/);
  assert.match(body, /August \d+, 2026/);
  assert.match(body, /\/download\/\d+/);
});

test("52-Week Scripture shows the current week and a year filter", async () => {
  const { status, body } = await get("/grow/resources/scripture-memory");
  assert.equal(status, 200);
  assert.match(body, /This week/);
  assert.match(body, /Psalm 23:1/);
  assert.match(body, /Week <!-- -->\d+/); // week number renders next to the date
});

test("52-Week Scripture year filter narrows the archive", async () => {
  const { status, body } = await get("/grow/resources/scripture-memory?year=2025");
  assert.equal(status, 200);
  assert.doesNotMatch(body, /This week/); // hidden when a year is selected
});

test("Intercede renders the campaign body and links back to the source", async () => {
  const { status, body } = await get("/intercede");
  assert.equal(status, 200);
  assert.match(body, /Prayer &amp; Fasting/);
  assert.match(body, /ccf\.org\.ph/);
  assert.doesNotMatch(body, /<form[\s>]/); // no fabricated prayer form
});

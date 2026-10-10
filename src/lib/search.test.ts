import assert from "node:assert/strict";
import test from "node:test";

import { allText, matchScore, PAGES, queryTerms } from "./search";

const pagesFor = (q: string) =>
  PAGES.filter((p) => matchScore(queryTerms(q), p.title, p.excerpt, p.keywords) > 0).map((p) => p.title);

test("questions keep only the words that matter", () => {
  assert.deepEqual(queryTerms("Where do I park?"), ["park"]);
  assert.deepEqual(queryTerms("What’s happening"), ["whats", "happening"]);
  // A query of only little words still searches for them.
  assert.deepEqual(queryTerms("who"), ["who"]);
});

test("every word must match, and title matches rank higher", () => {
  assert.equal(matchScore(["romans", "1:1"], "Romans 1:1-17"), 5);
  assert.equal(matchScore(["romans"], "The Significance of the Resurrection", "ROMANS 1:1-17"), 1);
  assert.equal(matchScore(["romans", "hebrews"], "Romans 1:1-17"), 0);
});

test("simple word endings still match", () => {
  assert.ok(matchScore(["parking"], "Where to park") > 0);
  assert.ok(matchScore(["prayers"], "Prayer Wall") > 0);
});

test("the searches the Chrome audit found empty now land on a page", () => {
  // 2026-10-10: "parking", "prayer" and "NXTGEN" found nothing.
  assert.ok(pagesFor("parking").includes("Where to park"));
  assert.ok(pagesFor("where to park").includes("Where to park"));
  assert.ok(pagesFor("prayer").includes("Prayer Wall"));
  assert.ok(pagesFor("NXTGEN").includes("The center"));
  assert.ok(pagesFor("volunteer").includes("Connect"));
  assert.ok(pagesFor("book a table").includes("Reserve a Dgroup table"));
});

test("every searchable page is a real site path", () => {
  for (const p of PAGES) assert.match(p.href, /^\/[a-z0-9/#-]*$/, p.href);
});

test("hyphens inside names don't stop a match", () => {
  // "Peter Tanchi" found nothing against "Peter Tan-Chi" (Chrome re-check, 2026-10-10).
  assert.ok(matchScore(queryTerms("Peter Tanchi"), "When Disillusioned, Focus on God", "Peter Tan-Chi") > 0);
  assert.ok(matchScore(queryTerms("d-group"), "Join a Dgroup") > 0);
});

test("allText reaches every string in a nested record", () => {
  assert.deepEqual(allText({ a: "x", b: [{ c: "y" }, null, 3], d: { e: "z" } }), ["x", "y", "z"]);
});

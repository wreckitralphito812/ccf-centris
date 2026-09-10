import assert from "node:assert/strict";
import test from "node:test";

import {
  bodyProblem,
  cleanBody,
  openRequests,
  PRAYER_BODY_MAX,
  safeNext,
  screenNameProblem,
} from "./prayer-wall";

test("screen names allow real names and handles", () => {
  for (const ok of ["Ana Cruz", "juan.dela-cruz_2", "Niño", "Tita   Beth"]) {
    assert.equal(screenNameProblem(ok), null, ok);
  }
});

test("screen names reject the too-short, the symbol-led, and the empty", () => {
  for (const bad of ["ab", "-ana", "ana!", "   ", "x".repeat(25)]) {
    assert.notEqual(screenNameProblem(bad), null, bad);
  }
});

test("bodies are trimmed and keep at most one blank line", () => {
  assert.equal(cleanBody("  Lord,\r\n\r\n\r\n\r\nhelp  "), "Lord,\n\nhelp");
});

test("bodies must say something, briefly", () => {
  assert.ok(bodyProblem(""));
  assert.ok(bodyProblem("x".repeat(PRAYER_BODY_MAX + 1)));
  assert.equal(bodyProblem("Please pray for my mother."), null);
});

test("return paths stay on this site", () => {
  assert.equal(safeNext("/prayer-wall"), "/prayer-wall");
  assert.equal(safeNext("//evil.example"), "/prayer-wall");
  assert.equal(safeNext("https://evil.example"), "/prayer-wall");
  assert.equal(safeNext(null, "/"), "/");
});

test("expired requests leave the wall", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  const posts = [
    { id: "open", expires_at: "2026-11-10T12:00:00Z" },
    { id: "gone", expires_at: "2026-09-10T11:59:59Z" },
  ];
  assert.deepEqual(openRequests(posts, now).map((p) => p.id), ["open"]);
});

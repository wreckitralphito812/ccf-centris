import assert from "node:assert/strict";
import test from "node:test";

import {
  bodyProblem,
  cleanBody,
  initials,
  isTopic,
  openRequests,
  PRAYER_BODY_MAX,
  safeNext,
  screenNameProblem,
  suggestScreenName,
  timeAgo,
  visibleReplies,
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

test("hidden replies show only to their author and to moderators", () => {
  const replies = [
    { id: "a", author_id: "ana", hidden_at: null },
    { id: "b", author_id: "ben", hidden_at: "2026-09-01T00:00:00Z" },
  ];
  assert.deepEqual(visibleReplies(replies, "dan", false).map((r) => r.id), ["a"]);
  assert.deepEqual(visibleReplies(replies, "ben", false).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(visibleReplies(replies, "dan", true).map((r) => r.id), ["a", "b"]);
});

test("the suggested screen name is first name and last initial, or nothing", () => {
  assert.equal(suggestScreenName("Ralph", "Relucio"), "Ralph R");
  assert.equal(suggestScreenName("Maria Clara", "de los Santos"), "Maria D");
  assert.equal(suggestScreenName("Jo", null), "");
  assert.equal(suggestScreenName("Bea", ""), "Bea");
  assert.equal(suggestScreenName(null, null), "");
});

test("avatar initials take two words, or the first two letters", () => {
  assert.equal(initials("Ralph R"), "RR");
  assert.equal(initials("tita_beth"), "TB");
  assert.equal(initials("Ana"), "AN");
});

test("times read as minutes, hours, days, then a date", () => {
  const now = new Date("2026-10-01T12:00:00+08:00");
  assert.equal(timeAgo("2026-10-01T11:59:40+08:00", now), "Just now");
  assert.equal(timeAgo("2026-10-01T11:45:00+08:00", now), "15m");
  assert.equal(timeAgo("2026-10-01T07:00:00+08:00", now), "5h");
  assert.equal(timeAgo("2026-09-28T12:00:00+08:00", now), "3d");
  assert.equal(timeAgo("2026-09-01T12:00:00+08:00", now), "Sep 1");
});

test("only known topics pass", () => {
  assert.equal(isTopic("health"), true);
  assert.equal(isTopic("gossip"), false);
  assert.equal(isTopic(null), false);
});

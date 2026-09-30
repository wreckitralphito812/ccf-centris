import assert from "node:assert/strict";
import test from "node:test";
import { manilaDayRange, manilaTomorrow } from "./reminders";

test("tomorrow is counted in Manila, not UTC", () => {
  // 2026-10-06 17:00 UTC is already Oct 7, 1 AM in Manila.
  assert.equal(manilaTomorrow(new Date("2026-10-06T17:00:00Z")), "2026-10-08");
  assert.equal(manilaTomorrow(new Date("2026-10-06T02:00:00Z")), "2026-10-07");
});

test("a Manila day as a UTC range for the reservations query", () => {
  assert.deepEqual(manilaDayRange("2026-10-07"), {
    from: "2026-10-06T16:00:00.000Z",
    to: "2026-10-07T16:00:00.000Z",
  });
});

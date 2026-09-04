import assert from "node:assert/strict";
import test from "node:test";

import { markSlots, type Busy } from "./availability";

// A fixed "now" well before the test day so nothing is auto-past.
const NOW = new Date("2099-01-01T00:00:00+08:00");
const DAY = "2099-01-02";

test("an empty day is all available", () => {
  const slots = markSlots(DAY, 6, 9, [], NOW);
  assert.deepEqual(
    slots.map((s) => s.state),
    ["available", "available", "available"],
  );
});

test("a confirmed reservation greys the overlapping hour", () => {
  const busy: Busy[] = [
    { start: `${DAY}T07:00:00+08:00`, end: `${DAY}T08:00:00+08:00`, kind: "reserved" },
  ];
  const slots = markSlots(DAY, 6, 9, busy, NOW);
  assert.deepEqual(
    slots.map((s) => s.state),
    ["available", "reserved", "available"],
  );
});

test("a pending reservation marks the hour pending, not reserved", () => {
  const busy: Busy[] = [
    { start: `${DAY}T06:30:00+08:00`, end: `${DAY}T07:30:00+08:00`, kind: "pending" },
  ];
  const slots = markSlots(DAY, 6, 9, busy, NOW);
  // Overlaps both the 06:00 and 07:00 slots.
  assert.deepEqual(
    slots.map((s) => s.state),
    ["pending", "pending", "available"],
  );
});

test("a blackout greys its hours", () => {
  const busy: Busy[] = [
    { start: `${DAY}T06:00:00+08:00`, end: `${DAY}T09:00:00+08:00`, kind: "blackout" },
  ];
  const slots = markSlots(DAY, 6, 9, busy, NOW);
  assert.ok(slots.every((s) => s.state === "reserved"));
});

test("hours already elapsed are unavailable", () => {
  const now = new Date(`${DAY}T08:00:00+08:00`);
  const slots = markSlots(DAY, 6, 9, [], now);
  assert.deepEqual(
    slots.map((s) => s.state),
    ["unavailable", "unavailable", "available"],
  );
});

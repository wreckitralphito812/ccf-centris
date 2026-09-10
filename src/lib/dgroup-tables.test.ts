import assert from "node:assert/strict";
import test from "node:test";

import {
  bookableNights,
  candidateTables,
  MAX_GROUP_SIZE,
  openSlots,
  parseDgroupBooking,
  tableKey,
} from "./dgroup-tables";

const none = new Set<string>();

test("assigns the smallest table that fits", () => {
  // The Welcome Center's 4-seater is the tightest fit for three people.
  assert.deepEqual(candidateTables(3, "either", none)[0], {
    roomSlug: "welcome-center",
    roomName: "Welcome Center",
    label: "W9",
    seats: 4,
  });
  assert.equal(candidateTables(5, "either", none)[0]?.label, "L1");
  assert.equal(candidateTables(7, "either", none)[0]?.label, "W1");
});

test("skips tables already booked for the slot", () => {
  const taken = new Set([tableKey("dgroup-lounge", "L1"), tableKey("dgroup-lounge", "L2")]);
  assert.equal(candidateTables(5, "dgroup-lounge", taken)[0]?.label, "L3");
});

test("keeps to the chosen room", () => {
  const picks = candidateTables(2, "dgroup-lounge", none);
  assert.ok(picks.length > 0);
  assert.ok(picks.every((t) => t.roomSlug === "dgroup-lounge"));
});

test("offers nothing when no table is big enough", () => {
  assert.deepEqual(candidateTables(MAX_GROUP_SIZE + 1, "either", none), []);
});

test("lists weeknights inside the booking window", () => {
  // 2026-09-10 is a Thursday.
  assert.deepEqual(bookableNights("2026-09-10", 7), [
    "2026-09-10",
    "2026-09-11",
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
  ]);
});

test("today's slots close once they start", () => {
  assert.deepEqual(openSlots("2026-09-10", "2026-09-10", 19 * 60).map((s) => s.id), ["2000"]);
  assert.equal(openSlots("2026-09-11", "2026-09-10", 23 * 60).length, 2);
});

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const valid = {
  date: "2026-09-11",
  slot: "1800",
  room: "either",
  leader_name: "Ana Cruz",
  contact_mobile: "0917 123 4567",
  group_size: "6",
  agree: "on",
};

test("a complete booking parses", () => {
  const r = parseDgroupBooking(form(valid), "2026-09-10", 12 * 60);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.groupSize, 6);
});

test("house rules must be agreed to", () => {
  const r = parseDgroupBooking(form({ ...valid, agree: "" }), "2026-09-10", 12 * 60);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.fieldErrors.agree);
});

test("rejects a night outside the list and a group too big for any table", () => {
  const r = parseDgroupBooking(
    form({ ...valid, date: "2026-09-13", group_size: String(MAX_GROUP_SIZE + 1) }),
    "2026-09-10",
    12 * 60,
  );
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.fieldErrors.date);
    assert.ok(r.fieldErrors.groupSize);
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  bookableNights,
  candidateTables,
  DGROUP_ROOMS,
  MAX_GROUP_SIZE,
  openSlots,
  parseDgroupBooking,
  tableKey,
} from "./dgroup-tables";

const none = new Set<string>();

const room = (slug: string) => DGROUP_ROOMS.find((r) => r.slug === slug)!;
const seatsOf = (slug: string) =>
  room(slug).tables.reduce((n, t) => n + t.seats, 0);

test("the tables match the CCF Centris floor plans", () => {
  // DGROUP PLAN: 1×8, 4×4, 2×3, 4×2 — eleven tables, 38 seats.
  const lounge = room("dgroup-lounge");
  assert.equal(lounge.tables.length, 11);
  assert.equal(seatsOf("dgroup-lounge"), 38);
  assert.equal(lounge.tables.find((t) => t.label === "1")?.seats, 8);
  assert.equal(lounge.tables.find((t) => t.label === "5")?.seats, 4);
  assert.equal(lounge.tables.find((t) => t.label === "7")?.seats, 3);
  assert.equal(lounge.tables.find((t) => t.label === "11")?.seats, 2);

  // WELCOME PLAN: fifteen tables of four, 60 seats.
  const welcome = room("welcome-center");
  assert.equal(welcome.tables.length, 15);
  assert.equal(seatsOf("welcome-center"), 60);
  assert.ok(welcome.tables.every((t) => t.seats === 4));

  // The single largest table caps the group size the form will accept.
  assert.equal(MAX_GROUP_SIZE, 8);
});

test("assigns the smallest table that fits", () => {
  // A pair gets a 2-seater, not the 8-seater.
  assert.deepEqual(candidateTables(2, "either", none)[0], {
    roomSlug: "dgroup-lounge",
    roomName: "Dgroup Lounge",
    label: "8",
    seats: 2,
  });
  // Three fits the Lounge's 3-seaters before any 4-seater.
  assert.equal(candidateTables(3, "either", none)[0]?.seats, 3);
  // Five fits nothing but the 8-seater.
  assert.equal(candidateTables(5, "either", none)[0]?.label, "1");
  assert.equal(candidateTables(5, "either", none)[0]?.seats, 8);
});

test("large tables stay free while a smaller one fits", () => {
  // The 8-seater is the last resort for a pair, never the first offer.
  const forTwo = candidateTables(2, "either", none);
  assert.equal(forTwo[0]?.seats, 2);
  assert.equal(forTwo.at(-1)?.seats, 8);
});

test("skips tables already booked for the slot", () => {
  // Both 3-seaters gone, so three people move up to a 4-seater.
  const taken = new Set([
    tableKey("dgroup-lounge", "6"),
    tableKey("dgroup-lounge", "7"),
  ]);
  assert.equal(candidateTables(3, "dgroup-lounge", taken)[0]?.seats, 4);
});

test("a table in one room never blocks the same number in the other", () => {
  // Both rooms have a table "2"; they are distinct bookings.
  const taken = new Set([tableKey("dgroup-lounge", "2")]);
  const picks = candidateTables(4, "either", taken);
  assert.ok(picks.some((t) => t.roomSlug === "welcome-center" && t.label === "2"));
  assert.ok(!picks.some((t) => t.roomSlug === "dgroup-lounge" && t.label === "2"));
});

test("keeps to the chosen room", () => {
  const picks = candidateTables(2, "dgroup-lounge", none);
  assert.ok(picks.length > 0);
  assert.ok(picks.every((t) => t.roomSlug === "dgroup-lounge"));
});

test("offers nothing when no table is big enough", () => {
  assert.deepEqual(candidateTables(MAX_GROUP_SIZE + 1, "either", none), []);
});

test("a full night never assigns the same table twice", () => {
  // Walk a night's worth of groups through the assigner the way the server
  // action does: take the best candidate, mark it taken, repeat. This is the
  // double-booking guarantee in pure form — the database's unique index is
  // the backstop, but the model should never propose a clash in the first
  // place.
  const taken = new Set<string>();
  const sizes = [2, 4, 3, 4, 2, 4, 4, 3, 2, 4, 4, 2, 4, 4, 1, 4, 2, 4, 4, 4];
  const assigned: string[] = [];

  for (const size of sizes) {
    const pick = candidateTables(size, "either", taken)[0];
    if (!pick) continue;
    const key = tableKey(pick.roomSlug, pick.label);
    assert.ok(!taken.has(key), `${key} was handed out twice`);
    assert.ok(pick.seats >= size, `${key} seats ${pick.seats}, group of ${size}`);
    taken.add(key);
    assigned.push(key);
  }

  assert.equal(new Set(assigned).size, assigned.length);
  // Twenty groups of four or fewer all fit: there are 25 tables seating 4+.
  assert.equal(assigned.length, sizes.length);
});

test("only one table in the whole center seats more than four", () => {
  // Worth knowing, and worth asserting so it can't change silently: the
  // Lounge's 8-seater is the only table a group of 5+ can use. Two such
  // groups on the same night and slot means the second is turned away.
  const big = DGROUP_ROOMS.flatMap((r) => r.tables).filter((t) => t.seats > 4);
  assert.equal(big.length, 1);
  assert.equal(big[0].seats, 8);

  const taken = new Set([tableKey("dgroup-lounge", "1")]);
  assert.deepEqual(candidateTables(5, "either", taken), []);
});

test("best fit does not strand a large group behind small ones", () => {
  // Fill every table a group of 8 could use, except the one 8-seater. Small
  // groups took the small tables, so the 8-seater is still there.
  const taken = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const pick = candidateTables(2, "either", taken)[0];
    if (pick) taken.add(tableKey(pick.roomSlug, pick.label));
  }
  const forEight = candidateTables(8, "either", taken)[0];
  assert.equal(forEight?.label, "1");
  assert.equal(forEight?.roomSlug, "dgroup-lounge");
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

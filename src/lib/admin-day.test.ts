import assert from "node:assert/strict";
import test from "node:test";

import { blockPosition, buildDayBoard, DAY_END, DAY_START, isDateKey, manilaDay, shiftDay, weekOf } from "./admin-day";

const table = (over: Partial<Parameters<typeof buildDayBoard>[1][number]> = {}) => ({
  id: "t1",
  leader_name: "Ana",
  contact_mobile: "0917 123 4567",
  group_size: 6,
  room_slug: "dgroup-lounge",
  table_labels: ["4"],
  booked_on: "2026-10-05",
  slot_id: "1600",
  status: "confirmed",
  ...over,
});

const room = (over: Partial<Parameters<typeof buildDayBoard>[2][number]> = {}) => ({
  id: "r1",
  contact_name: "Ben",
  contact_mobile: null,
  organization: "Elevate",
  activity_name: "Core huddle",
  participants: 20,
  facility_name: "John (MPH 1)",
  // 9:00 AM – 12 NN Manila on Oct 5.
  starts_at: "2026-10-05T01:00:00Z",
  ends_at: "2026-10-05T04:00:00Z",
  status: "approved",
  ...over,
});

test("the board keeps the day's live bookings and drops cancelled ones and other days", () => {
  const b = buildDayBoard(
    "2026-10-05",
    [table(), table({ id: "t2", status: "cancelled" }), table({ id: "t3", booked_on: "2026-10-06" })],
    [room(), room({ id: "r2", status: "rejected" }), room({ id: "r3", starts_at: "2026-10-06T01:00:00Z", ends_at: "2026-10-06T02:00:00Z" })],
  );
  assert.equal(b.stats.groups, 1);
  assert.equal(b.stats.people, 6);
  assert.equal(b.stats.roomsBooked, 1);
  assert.equal(b.stats.awaiting, 0);
});

test("tables sit under their slot and room, with every booked label lit", () => {
  const b = buildDayBoard(
    "2026-10-05",
    [table(), table({ id: "t2", table_labels: ["2", "3"], group_size: 10 }), table({ id: "t3", slot_id: "1300", room_slug: "welcome-center", table_labels: ["1"] })],
    [],
  );
  const four = b.slots.find((s) => s.slot.id === "1600")!;
  const lounge = four.rooms.find((r) => r.slug === "dgroup-lounge")!;
  assert.deepEqual(lounge.bookings.map((x) => x.id), ["t2", "t1"]);
  assert.deepEqual(lounge.labels, ["2", "3", "4"]);
  assert.equal(four.groups, 2);
  const one = b.slots.find((s) => s.slot.id === "1300")!;
  assert.equal(one.rooms.find((r) => r.slug === "welcome-center")!.bookings.length, 1);
});

test("room bookings land on the right Manila day and minutes", () => {
  // 11 PM UTC on Oct 4 is 7 AM Oct 5 in Manila.
  assert.equal(manilaDay("2026-10-04T23:00:00Z"), "2026-10-05");
  const b = buildDayBoard("2026-10-05", [], [room({ status: "pending" })]);
  const john = b.rooms.find((r) => r.name === "John (MPH 1)")!;
  assert.equal(john.blocks[0].from, 9 * 60);
  assert.equal(john.blocks[0].to, 12 * 60);
  assert.equal(b.stats.awaiting, 1);
});

test("a room the list doesn't know still gets a row", () => {
  const b = buildDayBoard("2026-10-05", [], [room({ facility_name: "Toddler's Room" })]);
  assert.ok(b.rooms.some((r) => r.name === "Toddler's Room" && r.blocks.length === 1));
});

test("timeline blocks are clamped to the center's hours", () => {
  assert.deepEqual(blockPosition(DAY_START, DAY_END), { left: 0, width: 100 });
  const early = blockPosition(7 * 60, DAY_START + 75);
  assert.equal(early.left, 0);
  assert.equal(Math.round(early.width), 10);
});

test("days shift and weeks run Monday to Saturday", () => {
  assert.equal(shiftDay("2026-10-31", 1), "2026-11-01");
  assert.deepEqual(weekOf("2026-10-07"), ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
  // Sunday belongs to the week that just ended.
  assert.equal(weekOf("2026-10-04")[0], "2026-09-28");
  assert.equal(isDateKey("2026-10-05"), true);
  assert.equal(isDateKey("2026-13-45"), false);
  assert.equal(isDateKey("tomorrow"), false);
});

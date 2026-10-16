import assert from "node:assert/strict";
import test from "node:test";

import { blockPosition, buildDayBoard, DAY_END, DAY_START, eventsOn, isDateKey, manilaDay, roomFor, shiftDay, weekOf } from "./admin-day";

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

test("days shift and weeks run Sunday to Saturday", () => {
  assert.equal(shiftDay("2026-10-31", 1), "2026-11-01");
  assert.deepEqual(weekOf("2026-10-07"), ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
  // Sunday starts its own week.
  assert.equal(weekOf("2026-10-04")[0], "2026-10-04");
  assert.equal(weekOf("2026-10-10")[0], "2026-10-04");
  assert.equal(isDateKey("2026-10-05"), true);
  assert.equal(isDateKey("2026-13-45"), false);
  assert.equal(isDateKey("tomorrow"), false);
});

test("bookings match their room by slug, whatever the database calls it (2026-10-14)", () => {
  // Production names the halls "Multipurpose Hall 1"; the site says "John (MPH 1)".
  const r = room({ facility_name: "Multipurpose Hall 1", facility_slug: "multipurpose-hall-1" });
  assert.equal(roomFor(r)?.name, "John (MPH 1)");
  const board = buildDayBoard("2026-10-05", [], [r]);
  assert.equal(board.rooms.find((x) => x.slug === "multipurpose-hall-1")!.blocks.length, 1);
  assert.ok(!board.rooms.some((x) => x.name === "Multipurpose Hall 1"));
});

test("the boards show every event on a day: published, hidden and calendar-only", () => {
  const events = [
    { id: "e1", title: "Elevate night", starts_at: "2026-10-05T11:00:00Z", ends_at: "2026-10-05T13:00:00Z", location_note: "John (MPH 1), Luke (MPH 2)", status: "published" },
    { id: "e2", title: "Staff retreat", starts_at: "2026-10-04T16:00:00Z", ends_at: "2026-10-06T16:00:00Z", location_note: "CCF Centris", status: "draft", calendar_only: true, dates: [{ starts_at: "2026-10-04T16:00:00Z", ends_at: "2026-10-06T16:00:00Z", all_day: true }] },
    { id: "e3", title: "Another day", starts_at: "2026-10-07T11:00:00Z", ends_at: null, location_note: "Main Hall" },
  ];
  const day = eventsOn(events, "2026-10-05");
  assert.deepEqual(day.map((e) => e.id), ["e2", "e1"]); // all-day first
  assert.deepEqual(day[1].rooms, ["multipurpose-hall-1", "multipurpose-hall-2"]);
  assert.equal(day[1].from, 19 * 60);
  assert.equal(day[0].from, null);
  assert.ok(day[0].hidden && day[0].calendarOnly);
  assert.deepEqual(day[0].rooms, []);
});

test("the Main Hall is on the boards, for bookings and events", () => {
  assert.equal(roomFor({ facility_slug: "main-worship-hall", facility_name: "Main Worship Hall" })?.name, "Main Hall");
  const day = eventsOn([{ id: "m", title: "Family Camp", starts_at: "2026-11-07T00:00:00Z", ends_at: "2026-11-07T09:00:00Z", location_note: "Main Hall" }], "2026-11-07");
  assert.deepEqual(day[0].rooms, ["main-worship-hall"]);
  assert.equal(buildDayBoard("2026-10-05", [], []).rooms[0].name, "Main Hall");
});

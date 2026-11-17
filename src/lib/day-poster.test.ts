import assert from "node:assert/strict";
import test from "node:test";

import { fitLine, POSTER_LIST_HEIGHT, posterLayout, posterRooms, posterTime, type PosterRoom } from "./day-poster";

// Wednesday 2026-11-18. Manila is UTC+8, so 19:00 Manila is 11:00Z.
const D = "2026-11-18";
const room = (over: object) => ({
  id: "r",
  contact_name: "Ben Cruz",
  contact_mobile: "0917 000 0000",
  organization: "Elevate",
  activity_name: "Worship practice",
  participants: 20,
  facility_name: "Multipurpose Hall 3",
  facility_slug: "multipurpose-hall-3",
  starts_at: "2026-11-18T10:00:00Z",
  ends_at: "2026-11-18T12:00:00Z",
  status: "approved",
  ...over,
});
const table = (id: string, slot: string, room: string, labels: string[], dgroup: string | null, leader = "Edwin Cua") => ({
  id,
  booked_on: D,
  slot_id: slot,
  room_slug: room,
  table_labels: labels,
  leader_name: leader,
  dgroup_name: dgroup,
  status: "confirmed",
});

const sample = () =>
  posterRooms({
    date: D,
    events: [
      { id: "e1", title: "Pastor Bong Saquing: PAG", starts_at: "2026-11-17T23:00:00Z", ends_at: "2026-11-18T07:00:00Z", location_note: "Main Hall, Welcome Center", status: "draft" },
      { id: "e2", title: "Apologetics 101", starts_at: "2026-11-18T11:00:00Z", ends_at: "2026-11-18T13:00:00Z", location_note: "Main Hall" },
      { id: "e3", title: "Outreach", starts_at: "2026-11-18T02:00:00Z", ends_at: "2026-11-18T04:00:00Z", location_note: "Eton Centris Piazza" },
    ],
    rooms: [room({ id: "r1" }), room({ id: "r2", status: "pending", activity_name: "Not yet approved" })],
    rentals: [
      { id: "c1", sport: "pickleball", booked_on: D, start_hour: 9, hours: 2, court_numbers: [1, 2], renter_name: "Ana Reyes", dgroup_name: "Ana's Dgroup", status: "confirmed" },
    ],
    tables: [
      table("t2", "1900", "dgroup-lounge", ["12"], "Edwin Cua Dgroup"),
      table("t1", "1600", "dgroup-lounge", ["4", "5"], null, "Joy Lim"),
      { ...table("t3", "1300", "welcome-center", ["7"], "Cancelled"), status: "cancelled" },
    ],
  });

test("room by room in the boards' order, each room by start time, an event under every room it uses", () => {
  const rooms = sample();
  assert.deepEqual(rooms.map((r) => r.name), ["Main Hall", "Matthew (MPH 3)", "Welcome Center", "Dgroup Lounge", "Gym", "Eton Centris Piazza"]);
  assert.deepEqual(rooms[0].items.map((i) => `${posterTime(i)} ${i.title}`), [
    "7:00 AM – 3:00 PM Pastor Bong Saquing: PAG",
    "7:00 PM – 9:00 PM Apologetics 101",
  ]);
  assert.equal(rooms[2].items[0].title, "Pastor Bong Saquing: PAG");
  assert.equal(rooms[1].items.length, 1, "only the approved request");
});

test("each Dgroup table booking: its time, its group (or leader) and its tables", () => {
  const lounge = sample().find((r) => r.name === "Dgroup Lounge")!;
  assert.deepEqual(
    lounge.items.map((i) => `${posterTime(i)} | ${i.title} | ${i.detail}`),
    ["4:00 PM – 6:30 PM | Joy Lim | Dgroup · Tables 4 + 5", "7:00 PM – 9:30 PM | Edwin Cua Dgroup | Dgroup · Table 12"],
  );
});

test("no phone numbers or emails make it onto the poster", () => {
  assert.ok(!JSON.stringify(sample()).includes("0917"));
});

const busy = (rooms: number, each: number): PosterRoom[] =>
  Array.from({ length: rooms }, (_, r) => ({
    key: `r${r}`,
    name: `Room ${r}`,
    items: Array.from({ length: each }, (_, i) => ({ key: `${r}-${i}`, from: 600 + i * 60, to: 660 + i * 60, title: "x", detail: null })),
  }));

test("rows shrink to fit the day; a very busy day is cut short with a count of the rest", () => {
  const used = (l: ReturnType<typeof posterLayout>) =>
    l.rooms.reduce((n, r) => n + l.heading + l.gap + r.items.length * (l.row + l.gap), 0) + (l.more ? l.row : 0);
  for (const [r, e] of [[1, 2], [4, 3], [6, 5], [8, 8]]) {
    const l = posterLayout(busy(r, e));
    assert.ok(used(l) <= POSTER_LIST_HEIGHT, `${r} rooms × ${e} fit`);
  }
  const quiet = posterLayout(busy(2, 2));
  assert.equal(quiet.more, 0);
  assert.ok(quiet.title > posterLayout(busy(6, 4)).title);
  const packed = posterLayout(busy(8, 8));
  assert.ok(packed.more > 0);
  assert.equal(packed.rooms.reduce((n, r) => n + r.items.length, 0) + packed.more, 64);
});

test("long lines shrink to fit one line, then end with an ellipsis", () => {
  assert.deepEqual(fitLine("Midweek Prayer", 44, 700, 30), { size: 44, text: "Midweek Prayer" });
  const longer = fitLine("Leaders Planning Meeting and Dinner", 44, 700, 30);
  assert.ok(longer.size < 44 && longer.size >= 30);
  const huge = fitLine("A".repeat(120), 44, 700, 30);
  assert.ok(huge.text.endsWith("…"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { fitLine, POSTER_LIST_HEIGHT, posterItems, posterScale, posterTime } from "./day-poster";

// Wednesday 2026-11-18. Manila is UTC+8, so 19:00 Manila is 11:00Z.
const D = "2026-11-18";
const room = (over: object) => ({
  id: "r",
  contact_name: "Ben Cruz",
  contact_mobile: "0917 000 0000",
  organization: "Elevate",
  activity_name: "Worship practice",
  participants: 20,
  facility_name: "Multipurpose Hall 1",
  facility_slug: "multipurpose-hall-1",
  starts_at: "2026-11-18T10:00:00Z",
  ends_at: "2026-11-18T12:00:00Z",
  status: "approved",
  ...over,
});

test("the day's events (hidden too), approved requests, court rentals and Dgroup tables, soonest first", () => {
  const items = posterItems({
    date: D,
    events: [
      { id: "e1", title: "COS meeting", starts_at: "2026-11-18T11:00:00Z", ends_at: "2026-11-18T13:00:00Z", location_note: "Luke (MPH 2)", status: "draft" },
      { id: "e2", title: "Prayer day", starts_at: "2026-11-18T00:00:00Z", ends_at: null, location_note: "Main Hall", dates: [{ starts_at: "2026-11-18T00:00:00Z", ends_at: null, all_day: true }] },
    ],
    rooms: [
      room({ id: "r1", request_group: "g1" }),
      room({ id: "r2", request_group: "g1", facility_name: "Multipurpose Hall 2", facility_slug: "multipurpose-hall-2" }),
      room({ id: "r3", status: "pending", activity_name: "Not yet approved" }),
      room({ id: "r4", starts_at: "2026-11-19T10:00:00Z", ends_at: "2026-11-19T12:00:00Z", activity_name: "Tomorrow" }),
    ],
    rentals: [
      { id: "c1", sport: "pickleball", booked_on: D, start_hour: 9, hours: 2, court_numbers: [1, 2], renter_name: "Ana Reyes", dgroup_name: "Ana's Dgroup", status: "confirmed" },
      { id: "c2", sport: "pickleball", booked_on: D, start_hour: 12, hours: 1, court_numbers: [3], renter_name: "Cancelled", status: "cancelled" },
    ],
    tables: [
      { id: "t1", booked_on: D, slot_id: "1900", room_slug: "welcome-center", status: "confirmed" },
      { id: "t2", booked_on: D, slot_id: "1900", room_slug: "welcome-center", status: "confirmed" },
      { id: "t3", booked_on: D, slot_id: "1300", room_slug: "dgroup-lounge", status: "cancelled" },
    ],
  });
  assert.deepEqual(
    items.map((i) => `${posterTime(i)} | ${i.title} | ${i.where} | ${i.who ?? ""}`),
    [
      "All day | Prayer day | Main Hall | ",
      "9:00 AM – 11:00 AM | Pickleball · Courts 1 & 2 | Gym | Ana Reyes (Ana's Dgroup)",
      "6:00 PM – 8:00 PM | Worship practice | John (MPH 1), Luke (MPH 2) | Elevate",
      "7:00 PM – 9:00 PM | COS meeting | Luke (MPH 2) | ",
      "7:00 PM – 9:30 PM | Dgroup tables | Welcome Center | 2 Dgroups",
    ],
  );
});

test("no phone numbers or emails make it onto the poster", () => {
  const items = posterItems({ date: D, events: [], rooms: [room({ id: "r1" })], rentals: [], tables: [] });
  assert.ok(!JSON.stringify(items).includes("0917"));
});

test("rows shrink to fit the day, and a very busy day stops at a line limit", () => {
  const fits = (n: number) => {
    const s = posterScale(n);
    const k = Math.min(n, s.max);
    return k * s.row + (k - 1) * s.gap <= POSTER_LIST_HEIGHT;
  };
  for (const n of [1, 3, 8, 12, 15, 16, 30]) assert.ok(fits(n), `${n} lines fit`);
  assert.equal(posterScale(3).title, 44);
  assert.ok(posterScale(14).title < posterScale(6).title);
  assert.ok(posterScale(40).row >= 72);
});

test("long lines shrink to fit one line, then end with an ellipsis", () => {
  const short = fitLine("Midweek Prayer", 44, 700, 30);
  assert.deepEqual(short, { size: 44, text: "Midweek Prayer" });
  const longer = fitLine("Leaders Planning Meeting and Dinner", 44, 700, 30);
  assert.ok(longer.size < 44 && longer.size >= 30);
  assert.equal(longer.text, "Leaders Planning Meeting and Dinner");
  const huge = fitLine("A".repeat(120), 44, 700, 30);
  assert.equal(huge.size, 30);
  assert.ok(huge.text.endsWith("…") && huge.text.length * 30 * 0.56 <= 700);
});

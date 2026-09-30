import assert from "node:assert/strict";
import test from "node:test";
import { mergeUpcoming } from "./my-bookings";

const table = { id: "t1", room_slug: "welcome-center", table_labels: ["4", "5"], booked_on: "2026-10-07", slot_id: "1600", group_size: 6 };
const room = (id: string, status: string, starts: string, ends: string) => ({
  id, facility_name: "John (MPH 1)", court_name: null, activity_name: "Huddle", starts_at: starts, ends_at: ends, status, participants: 60,
});

test("tables and rooms merge into one list, soonest first", () => {
  const list = mergeUpcoming(
    [table],
    [room("r1", "pending", "2026-10-06T01:00:00Z", "2026-10-06T04:00:00Z"), room("r2", "approved", "2026-10-10T01:00:00Z", "2026-10-10T04:00:00Z")],
    new Date("2026-10-05T00:00:00Z"),
  );
  assert.deepEqual(list.map((b) => b.id), ["r1", "t1", "r2"]);
  assert.equal(list[1].kind, "table");
  assert.equal(list[1].date, "2026-10-07");
  assert.equal(list[1].title, "Tables 4 + 5 · Welcome Center");
  assert.equal(list[1].status, "confirmed");
  assert.equal(list[0].date, "2026-10-06"); // 09:00 Manila
  assert.equal(list[0].time, "9:00 AM – 12 NN");
});

test("finished, declined and cancelled rooms are left out", () => {
  const list = mergeUpcoming(
    [],
    [room("old", "approved", "2026-10-01T01:00:00Z", "2026-10-01T04:00:00Z"), room("no", "rejected", "2026-10-09T01:00:00Z", "2026-10-09T04:00:00Z"), room("x", "cancelled", "2026-10-09T01:00:00Z", "2026-10-09T04:00:00Z")],
    new Date("2026-10-05T00:00:00Z"),
  );
  assert.equal(list.length, 0);
});

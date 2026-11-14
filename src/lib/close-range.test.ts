import assert from "node:assert/strict";
import test from "node:test";

import { closeDays, parseTablePicks, tableBlockRows } from "./close-range";

// 2026-11-17 is a Tuesday.

test("a closure over several days: first from its start, last until its end, all day between", () => {
  const r = closeDays("2026-11-17", "13:00", "2026-11-19", "18:00");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.days, [
    { date: "2026-11-17", from: 13 * 60, to: 22 * 60 },
    { date: "2026-11-18", from: 7 * 60, to: 22 * 60 },
    { date: "2026-11-19", from: 7 * 60, to: 18 * 60 },
  ]);
});

test("one day, clipped to the center's hours", () => {
  const r = closeDays("2026-11-17", "06:00", "2026-11-17", "23:00");
  assert.deepEqual(r.ok && r.days, [{ date: "2026-11-17", from: 7 * 60, to: 22 * 60 }]);
});

test("backwards, empty, too long, or outside the center's hours is refused", () => {
  assert.equal(closeDays("2026-11-18", "09:00", "2026-11-17", "21:00").ok, false);
  assert.equal(closeDays("2026-11-17", "15:00", "2026-11-17", "15:00").ok, false);
  assert.equal(closeDays("2026-11-17", "09:00", "2027-11-17", "21:00").ok, false);
  assert.equal(closeDays("2026-11-17", "22:30", "2026-11-17", "23:30").ok, false);
  assert.equal(closeDays("", "09:00", "2026-11-17", "21:00").ok, false);
});

test("table ticks: a whole room, some tables, or every table ticked one by one", () => {
  assert.deepEqual(parseTablePicks(["welcome-center:*", "welcome-center:3"]), [{ room: "welcome-center", labels: null }]);
  assert.deepEqual(parseTablePicks(["dgroup-lounge:5", "dgroup-lounge:4", "nowhere:1"]), [{ room: "dgroup-lounge", labels: ["4", "5"] }]);
  const all = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "12"].map((l) => `dgroup-lounge:${l}`);
  assert.deepEqual(parseTablePicks(all), [{ room: "dgroup-lounge", labels: null }]);
});

test("table blocks: Dgroup nights only, the slots the hours touch, all day when they touch all three", () => {
  const r = closeDays("2026-11-16", "16:30", "2026-11-18", "14:00"); // Monday to Wednesday
  assert.ok(r.ok);
  if (!r.ok) return;
  const rows = tableBlockRows(r.days, [{ room: "welcome-center", labels: ["4", "5"] }, { room: "dgroup-lounge", labels: null }]);
  // Monday: no Dgroup tables. Tuesday: all day. Wednesday until 2 PM: the 1:00 slot only.
  assert.deepEqual(
    rows.map((x) => `${x.booked_on} ${x.room_slug} ${x.table_label ?? "all"} ${x.slot_id ?? "day"}`),
    [
      "2026-11-17 welcome-center 4 day",
      "2026-11-17 welcome-center 5 day",
      "2026-11-17 dgroup-lounge all day",
      "2026-11-18 welcome-center 4 1300",
      "2026-11-18 welcome-center 5 1300",
      "2026-11-18 dgroup-lounge all 1300",
    ],
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  MINISTRY_ROOMS,
  TIME_BLOCKS,
  closedReason,
  firstOpenDay,
  ministryRoom,
  ministryWindow,
  setupsFor,
  tableSeats,
  tablesInUse,
  tablesSummary,
  type TableHold,
  timeLabel,
  toMinutes,
  weekdayOf,
} from "./ministry-rooms";
import { parseRoomRequest } from "./validation";

// 2099-06-01 is a Monday, the 2nd a Tuesday, the 5th a Friday, the 6th a
// Saturday and the 7th a Sunday.
const MON = "2099-06-01";
const TUE = "2099-06-02";
const FRI = "2099-06-05";
const SAT = "2099-06-06";
const SUN = "2099-06-07";

test("the test dates fall on the days they claim", () => {
  assert.equal(weekdayOf(MON), 1);
  assert.equal(weekdayOf(TUE), 2);
  assert.equal(weekdayOf(FRI), 5);
  assert.equal(weekdayOf(SAT), 6);
  assert.equal(weekdayOf(SUN), 0);
});

test("the four halls are open Tuesday to Friday, 9:00 AM to 9:30 PM", () => {
  for (const date of [TUE, FRI]) {
    assert.deepEqual(ministryWindow("multipurpose-hall-1", date), { from: toMinutes("09:00"), to: toMinutes("21:30") });
  }
  for (const date of [SAT, SUN, MON]) assert.equal(ministryWindow("multipurpose-hall-4", date), null, date);
});

test("the Dgroup rooms are mornings-only for ministries, Tuesday to Friday", () => {
  for (const slug of ["dgroup-lounge", "welcome-center"]) {
    assert.deepEqual(ministryWindow(slug, TUE), { from: toMinutes("09:00"), to: toMinutes("12:00") });
    assert.deepEqual(ministryWindow(slug, FRI), { from: toMinutes("09:00"), to: toMinutes("12:00") });
    for (const date of [SAT, SUN, MON]) assert.equal(ministryWindow(slug, date), null, date);
  }
});

test("an afternoon in the lounge is refused, because Dgroups have it", () => {
  assert.equal(closedReason("dgroup-lounge", TUE, toMinutes("09:00"), toMinutes("12:00")), null);
  assert.match(closedReason("dgroup-lounge", TUE, toMinutes("11:00"), toMinutes("13:00")) ?? "", /Dgroups/);
  assert.match(closedReason("dgroup-lounge", SAT, toMinutes("09:00"), toMinutes("12:00")) ?? "", /Tuesday to Friday/);
});

test("times read the way the center writes them", () => {
  assert.equal(timeLabel(toMinutes("09:00")), "9:00 AM");
  assert.equal(timeLabel(toMinutes("12:00")), "12 NN");
  assert.equal(timeLabel(toMinutes("21:30")), "9:30 PM");
});

function request(overrides: Record<string, string | string[]> = {}): FormData {
  const base: Record<string, string | string[]> = {
    activity: "Elevate core huddle",
    ministry: "Elevate",
    participants: "40",
    setup: "classroom",
    date: TUE,
    start: "18:00",
    end: "20:30",
    room: ["multipurpose-hall-1"],
    food: "own",
    name: "Juan dela Cruz",
    mobile: "0917 123 4567",
    accept: "on",
    eq_mic_wireless: "2",
    ...overrides,
  };
  const f = new FormData();
  for (const [k, v] of Object.entries(base)) for (const one of [v].flat()) f.append(k, one);
  return f;
}

test("parseRoomRequest accepts a complete request", () => {
  const r = parseRoomRequest(request());
  assert.ok(r.ok, JSON.stringify(!r.ok && r.fieldErrors));
  assert.deepEqual(r.value.rooms, ["multipurpose-hall-1"]);
  assert.deepEqual(r.value.equipment, { mic_wireless: 2 });
  assert.equal(r.value.starts_at, "2099-06-02T10:00:00.000Z");
});

test("parseRoomRequest takes several rooms in one request", () => {
  const r = parseRoomRequest(request({ room: ["multipurpose-hall-1", "multipurpose-hall-2"] }));
  assert.ok(r.ok);
  assert.equal(r.value.rooms.length, 2);
});

test("parseRoomRequest refuses Saturday to Monday, closed rooms and odd times", () => {
  for (const date of [SAT, SUN, MON]) {
    const closed = parseRoomRequest(request({ date }));
    assert.ok(!closed.ok && /Tuesday to Friday/.test(closed.fieldErrors.date), date);
  }

  const lounge = parseRoomRequest(request({ room: ["dgroup-lounge"] }));
  assert.ok(!lounge.ok && /isn't open then/.test(lounge.fieldErrors.rooms));

  const late = parseRoomRequest(request({ start: "20:00", end: "22:00" }));
  assert.ok(!late.ok && late.fieldErrors.rooms);

  const odd = parseRoomRequest(request({ start: "18:15" }));
  assert.ok(!odd.ok && odd.fieldErrors.time);

  const backwards = parseRoomRequest(request({ start: "19:00", end: "18:00" }));
  assert.ok(!backwards.ok && backwards.fieldErrors.time);
});

test("parseRoomRequest refuses a room that doesn't offer the set-up, or isn't a ministry room", () => {
  const furniture = parseRoomRequest(request({ setup: "furniture" }));
  assert.ok(!furniture.ok && furniture.fieldErrors.rooms);

  const hall = parseRoomRequest(request({ room: ["main-worship-hall"] }));
  assert.ok(!hall.ok && hall.fieldErrors.rooms);
});

test("parseRoomRequest caps equipment at what the center has", () => {
  const r = parseRoomRequest(request({ eq_mic_wireless: "9", eq_podium: "3" }));
  assert.ok(r.ok);
  assert.deepEqual(r.value.equipment, { mic_wireless: 2, podium: 1 });
});

test("parseRoomRequest needs the policies, a mobile number and a known ministry", () => {
  const r = parseRoomRequest(request({ accept: "", mobile: "", ministry: "Made Up" }));
  assert.ok(!r.ok);
  assert.ok(r.fieldErrors.accept && r.fieldErrors.mobile && r.fieldErrors.ministry);

  const other = parseRoomRequest(request({ ministry: "Other", ministry_other: "Prayer Ministry" }));
  assert.ok(other.ok);
  assert.equal(other.value.ministry, "Prayer Ministry");
});

test("parseRoomRequest holds the line on edited fields (Chrome audit, 2026-10-10)", () => {
  const seats = ministryRoom("multipurpose-hall-1")!.capacity.classroom!;
  const crowd = parseRoomRequest(request({ participants: String(seats + 1) }));
  assert.ok(!crowd.ok && /fewer than your/.test(crowd.fieldErrors.rooms), "more people than the rooms seat");
  const two = parseRoomRequest(request({ participants: String(seats + 1), room: ["multipurpose-hall-1", "multipurpose-hall-2"] }));
  assert.ok(two.ok, "a second room makes room");

  const nobody = parseRoomRequest(request({ participants: "0" }));
  assert.ok(!nobody.ok && nobody.fieldErrors.participants);
  const past = parseRoomRequest(request({ date: "2020-06-02" }));
  assert.ok(!past.ok && past.fieldErrors.time);

  const long = parseRoomRequest(request({ activity: "x".repeat(121), notes: "y".repeat(1001), name: "z".repeat(121) }));
  assert.ok(!long.ok && long.fieldErrors.activity && long.fieldErrors.notes && long.fieldErrors.name);
});

test("requests need 2 days' notice, and land Tuesday to Friday", () => {
  // Ralph, 2026-10-10: on Monday, Wednesday is the earliest.
  assert.equal(firstOpenDay("2026-10-05"), "2026-10-07"); // Monday -> Wednesday
  assert.equal(firstOpenDay("2026-10-09"), "2026-10-13"); // Friday -> Sunday, Monday skipped -> Tuesday
  assert.equal(firstOpenDay("2026-10-04"), "2026-10-06"); // Sunday -> Tuesday

  const now = Date.parse("2026-10-05T02:00:00Z"); // Monday 10 AM in Manila
  const tooSoon = parseRoomRequest(request({ date: "2026-10-06" }), now);
  assert.ok(!tooSoon.ok && /2 days/.test(tooSoon.fieldErrors.date));
  const fine = parseRoomRequest(request({ date: "2026-10-07" }), now);
  assert.ok(fine.ok, JSON.stringify(!fine.ok && fine.fieldErrors));
});

test("the welcome center and lounge are used as furnished; the halls take tables or none", () => {
  const lounge = ministryRoom("dgroup-lounge")!;
  assert.deepEqual(setupsFor(lounge).map((s) => s.id), ["furniture"]);
  assert.deepEqual(setupsFor(ministryRoom("multipurpose-hall-1")!).map((s) => s.id), ["classroom", "tables", "open"]);
  const morning = { date: TUE, start: "09:00", end: "11:00", room: ["dgroup-lounge"], participants: "20" };
  const classroom = parseRoomRequest(request({ ...morning, setup: "classroom" }));
  assert.ok(!classroom.ok && /set-up/.test(classroom.fieldErrors.rooms));
  const furnished = parseRoomRequest(request({ ...morning, setup: "furniture" }));
  assert.ok(furnished.ok, JSON.stringify(!furnished.ok && furnished.fieldErrors));
  const rehearsal = parseRoomRequest(request({ setup: "open" }));
  assert.ok(rehearsal.ok);
});

test("the tables set-up says how many tables, which must seat everyone and exist", () => {
  const none = parseRoomRequest(request({ setup: "tables", participants: "30" }));
  assert.ok(!none.ok && /how many tables/.test(none.fieldErrors.tables));
  const short = parseRoomRequest(request({ setup: "tables", participants: "30", tables_square: "5" }));
  assert.ok(!short.ok && /seat 20, fewer than your 30/.test(short.fieldErrors.tables));
  const ok = parseRoomRequest(request({ setup: "tables", participants: "30", tables_square: "3", tables_large: "3" }));
  assert.ok(ok.ok && ok.value.tables.square === 3 && ok.value.tables.large === 3 && !ok.value.tables.medium);
  const more = parseRoomRequest(request({ setup: "tables", participants: "30", tables_large: "41" }));
  assert.ok(!more.ok && /has 40 large/.test(more.fieldErrors.tables));
  assert.equal(tableSeats({ square: 1, medium: 1, large: 1 }), 18);
  assert.equal(tablesSummary({ square: 3, large: 2 }), "3 square, 2 large rectangle tables");
});

test("tables in use count only requests that overlap at the same moment", () => {
  const holds: TableHold[] = [
    [toMinutes("09:00"), toMinutes("12:00"), { square: 10 }],
    [toMinutes("13:00"), toMinutes("17:00"), { square: 8, large: 5 }],
    [toMinutes("15:00"), toMinutes("18:00"), { square: 4 }],
  ];
  // 11:00-16:00 sees the morning's 10, then 8 + 4 = 12 from 15:00: the most at once is 12.
  assert.deepEqual(tablesInUse(holds, toMinutes("11:00"), toMinutes("16:00")), { square: 12, medium: 0, large: 5 });
  assert.deepEqual(tablesInUse(holds, toMinutes("18:00"), toMinutes("21:00")), { square: 0, medium: 0, large: 0 });
});

test("every time block fits the big halls' hours, on the half hour", () => {
  const hall = MINISTRY_ROOMS.find((r) => !r.dgroupRoom)!;
  for (const b of TIME_BLOCKS) {
    assert.equal(b.from % 30, 0);
    assert.equal(b.to % 30, 0);
    assert.equal(closedReason(hall.slug, "2026-10-06", b.from, b.to), null, b.id);
  }
});

test("only the morning block suits the Dgroup rooms", () => {
  const [morning, afternoon] = TIME_BLOCKS;
  assert.equal(closedReason("welcome-center", "2026-10-06", morning.from, morning.to), null);
  assert.notEqual(closedReason("welcome-center", "2026-10-06", afternoon.from, afternoon.to), null);
  assert.notEqual(closedReason("welcome-center", "2026-10-10", morning.from, morning.to), null); // Saturday
});

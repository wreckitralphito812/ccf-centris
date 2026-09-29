import assert from "node:assert/strict";
import test from "node:test";

import { closedReason, ministryWindow, timeLabel, toMinutes, weekdayOf } from "./ministry-rooms";
import { parseRoomRequest } from "./validation";

// 2099-06-01 is a Monday; the 6th a Saturday; the 7th a Sunday.
const MON = "2099-06-01";
const SAT = "2099-06-06";
const SUN = "2099-06-07";

test("the test dates fall on the days they claim", () => {
  assert.equal(weekdayOf(MON), 1);
  assert.equal(weekdayOf(SAT), 6);
  assert.equal(weekdayOf(SUN), 0);
});

test("the four halls are open Monday to Saturday, 9:00 AM to 9:30 PM", () => {
  for (const date of [MON, SAT]) {
    assert.deepEqual(ministryWindow("multipurpose-hall-1", date), { from: toMinutes("09:00"), to: toMinutes("21:30") });
  }
  assert.equal(ministryWindow("multipurpose-hall-4", SUN), null);
});

test("the Dgroup rooms are mornings-only for ministries on weekdays, all day on Saturdays", () => {
  for (const slug of ["dgroup-lounge", "welcome-center"]) {
    assert.deepEqual(ministryWindow(slug, MON), { from: toMinutes("09:00"), to: toMinutes("12:00") });
    assert.deepEqual(ministryWindow(slug, SAT), { from: toMinutes("09:00"), to: toMinutes("21:30") });
    assert.equal(ministryWindow(slug, SUN), null);
  }
});

test("a weekday afternoon in the lounge is refused, because Dgroups have it", () => {
  assert.equal(closedReason("dgroup-lounge", MON, toMinutes("09:00"), toMinutes("12:00")), null);
  assert.match(closedReason("dgroup-lounge", MON, toMinutes("11:00"), toMinutes("13:00")) ?? "", /Dgroups/);
  assert.equal(closedReason("dgroup-lounge", SAT, toMinutes("13:00"), toMinutes("21:30")), null);
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
    date: MON,
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
  assert.equal(r.value.starts_at, "2099-06-01T10:00:00.000Z");
});

test("parseRoomRequest takes several rooms in one request", () => {
  const r = parseRoomRequest(request({ room: ["multipurpose-hall-1", "multipurpose-hall-2"] }));
  assert.ok(r.ok);
  assert.equal(r.value.rooms.length, 2);
});

test("parseRoomRequest refuses Sundays, closed rooms and odd times", () => {
  const sunday = parseRoomRequest(request({ date: SUN }));
  assert.ok(!sunday.ok && sunday.fieldErrors.date);

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

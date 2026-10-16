import assert from "node:assert/strict";
import test from "node:test";

import { describeChanges, EDIT_TIMES, parseRoomEdit, type RoomRequestDetails } from "./room-edit";

function form(over: Record<string, string | string[]> = {}): FormData {
  const base: Record<string, string | string[]> = {
    room: ["multipurpose-hall-1"],
    date: "2026-10-19", // a Monday: admins may book it anyway
    start: "18:00",
    end: "21:00",
    activity_name: "Elevate night",
    organization: "Elevate",
    participants: "40",
    layout: "classroom",
    food: "own",
    purpose: "",
    contact_name: "Ana Santos",
    contact_email: "ana@example.test",
    contact_mobile: "0917 111 2222",
    ...over,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}

test("admins can put a request in any room, Main Hall included, on any day", () => {
  const r = parseRoomEdit(form({ room: ["main-worship-hall", "multipurpose-hall-2"] }));
  assert.ok(r.ok);
  assert.deepEqual(r.value.rooms, ["main-worship-hall", "multipurpose-hall-2"]);
});

test("an edit still needs a room, a real time and a requester to email", () => {
  const bad = (over: Record<string, string | string[]>) => {
    const r = parseRoomEdit(form(over));
    return r.ok ? null : r.error;
  };
  assert.match(bad({ room: [] }) ?? "", /room/);
  assert.match(bad({ room: ["the-roof"] }) ?? "", /isn't on the list/);
  assert.match(bad({ end: "17:00" }) ?? "", /after the start/);
  assert.match(bad({ start: "18:15" }) ?? "", /start and end/);
  assert.match(bad({ contact_email: "nope" }) ?? "", /email/);
  assert.match(bad({ layout: "tables", tables_large: "41" }) ?? "", /40 large/);
  assert.equal(EDIT_TIMES[0], "06:00");
  assert.equal(EDIT_TIMES.at(-1), "22:00");
});

test("the email lists what changed, in plain words", () => {
  const before = (parseRoomEdit(form()) as { ok: true; value: RoomRequestDetails }).value;
  const after = (parseRoomEdit(form({ room: ["multipurpose-hall-2"], start: "19:00", participants: "50", eq_mic_wireless: "2" })) as {
    ok: true;
    value: RoomRequestDetails;
  }).value;
  assert.deepEqual(describeChanges(before, after), [
    "Room: John (MPH 1) → Luke (MPH 2)",
    "When: Monday, 19 October, 6:00 PM to 9:00 PM → Monday, 19 October, 7:00 PM to 9:00 PM",
    "People: 40 → 50",
    "Equipment: None → 2 wireless mics",
  ]);
  assert.deepEqual(describeChanges(before, before), []);
});

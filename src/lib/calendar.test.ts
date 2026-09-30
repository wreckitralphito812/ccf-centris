import assert from "node:assert/strict";
import test from "node:test";

import { dgroupEvent, googleCalendarLink, icsFile, manilaParts, roomEvent, utcStamp } from "./calendar";

const table = dgroupEvent({ date: "2026-10-06", slotId: "1600", roomSlug: "welcome-center", labels: ["4", "5"] });

test("Manila times become UTC stamps", () => {
  assert.equal(utcStamp("2026-10-06", "16:00"), "20261006T080000Z");
  assert.equal(utcStamp("2026-10-06", "07:00"), "20261005T230000Z");
});

test("UTC times read back as Manila dates and times", () => {
  assert.deepEqual(manilaParts("2026-10-05T23:30:00.000Z"), { date: "2026-10-06", time: "07:30" });
});

test("a Dgroup booking runs for its slot", () => {
  assert.equal(table.title, "Dgroup · Tables 4 + 5, Welcome Center");
  assert.equal(table.start, "16:00");
  assert.equal(table.end, "18:30");
});

test("the Google link carries the title, times and place", () => {
  const url = new URL(googleCalendarLink(table));
  assert.equal(url.hostname, "calendar.google.com");
  assert.equal(url.searchParams.get("text"), table.title);
  assert.equal(url.searchParams.get("dates"), "20261006T080000Z/20261006T103000Z");
  assert.match(url.searchParams.get("location")!, /Centris Station/);
});

test("the .ics file is valid: CRLF lines, escaped text, folded at 75 octets", () => {
  const ics = icsFile(table, new Date("2026-09-30T00:00:00Z"));
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART:20261006T080000Z\r\n/);
  assert.match(ics, /DTSTAMP:20260930T000000Z\r\n/);
  assert.match(ics, /SUMMARY:Dgroup · Tables 4 \+ 5\\, Welcome Center/);
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});

test("a room request says it's waiting until it's confirmed", () => {
  const r = { reference: "R-7K2M", activity: "Elevate huddle", rooms: ["John (MPH 1)"], date: "2026-10-06", start: "13:00", end: "17:00" };
  assert.equal(roomEvent({ ...r, confirmed: false }).title, "Elevate huddle (room requested)");
  assert.equal(roomEvent({ ...r, confirmed: true }).title, "Elevate huddle");
  assert.equal(roomEvent({ ...r, confirmed: true }).uid, "room-R-7K2M");
});

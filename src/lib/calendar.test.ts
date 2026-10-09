import assert from "node:assert/strict";
import test from "node:test";

import { dgroupEvent, eventFromIcsParam, googleCalendarLink, icsFile, icsHref, manilaParts, roomEvent, utcStamp } from "./calendar";

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

test("the page link is the same on every render", () => {
  assert.equal(icsHref(table), icsHref(table));
});

test("an all-day event over several days covers every day, in both formats", () => {
  const retreat = { uid: "event-x", title: "Love Triangle", date: "2026-10-16", endDate: "2026-10-18", start: "00:00", end: "23:59", details: "d", allDay: true };
  const url = new URL(googleCalendarLink(retreat));
  assert.equal(url.searchParams.get("dates"), "20261016/20261019");
  const ics = icsFile(retreat, new Date("2026-09-30T00:00:00Z"));
  assert.match(ics, /DTSTART;VALUE=DATE:20261016\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261019\r\n/);
  // A one-day all-day date ends the next morning.
  assert.equal(new URL(googleCalendarLink({ ...retreat, endDate: undefined })).searchParams.get("dates"), "20261016/20261017");
});

test("the .ics link round-trips through /api/calendar and refuses anything else", () => {
  const href = icsHref({ ...table, location: "Dgroup Lounge, CCF Centris — “2/F”" });
  assert.match(href, /^\/api\/calendar\?e=[A-Za-z0-9_-]+$/);
  const back = eventFromIcsParam(new URL(href, "https://x").searchParams.get("e"));
  assert.equal(back?.title, table.title);
  assert.equal(back?.location, "Dgroup Lounge, CCF Centris — “2/F”");
  for (const bad of [null, "", "not-base64!!", Buffer.from('{"title":"x"}').toString("base64"), "A".repeat(5000)]) {
    assert.equal(eventFromIcsParam(bad), null);
  }
});

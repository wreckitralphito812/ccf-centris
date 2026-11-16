import assert from "node:assert/strict";
import test from "node:test";

import { rentalsAsGymBookings } from "./court-rentals";
import { clashesOn } from "./clashes";

// Wednesday 2026-11-18; Manila is UTC+8, so 11:00Z is 7:00 PM there.
const D = "2026-11-18";
const ev = (id: string, title: string, s: string, e: string | null, where: string, status = "published") => ({
  id,
  title,
  starts_at: s,
  ends_at: e,
  location_note: where,
  status,
});
const request = (id: string, title: string, s: string, e: string, slug: string, status = "approved") => ({
  id,
  contact_name: "X",
  contact_mobile: null,
  organization: null,
  activity_name: title,
  participants: 10,
  facility_name: null,
  facility_slug: slug,
  starts_at: s,
  ends_at: e,
  status,
});

test("two events in the same room at overlapping times clash, hidden or not", () => {
  const c = clashesOn(
    D,
    [
      ev("a", "COS - ONE Meeting", "2026-11-18T11:00:00Z", "2026-11-18T13:00:00Z", "John (MPH 1)", "draft"),
      ev("b", "Robert Tiu D12 Meeting", "2026-11-18T12:00:00Z", "2026-11-18T13:30:00Z", "John (MPH 1), Luke (MPH 2)", "draft"),
      ev("c", "Next door", "2026-11-18T11:00:00Z", "2026-11-18T13:00:00Z", "Mark (MPH 4)"),
    ],
    [],
  );
  assert.equal(c.length, 1);
  assert.equal(c[0].roomName, "John (MPH 1)");
  assert.equal(c[0].from, 20 * 60);
  assert.equal(c[0].to, 21 * 60);
  assert.deepEqual([c[0].a.title, c[0].b.title], ["COS - ONE Meeting", "Robert Tiu D12 Meeting"]);
  assert.equal(c[0].a.href, "/admin/events/a");
});

test("an event on a room request clashes, a waiting one too; back-to-back doesn't", () => {
  const c = clashesOn(
    D,
    [ev("a", "Leaders' meeting", "2026-11-18T02:00:00Z", "2026-11-18T04:00:00Z", "Luke (MPH 2)")],
    [
      request("r1", "Choir practice", "2026-11-18T03:00:00Z", "2026-11-18T05:00:00Z", "multipurpose-hall-2", "pending"),
      request("r2", "Right after", "2026-11-18T04:00:00Z", "2026-11-18T06:00:00Z", "multipurpose-hall-3"),
      request("r3", "Declined", "2026-11-18T02:00:00Z", "2026-11-18T04:00:00Z", "multipurpose-hall-2", "rejected"),
    ],
  );
  assert.equal(c.length, 1);
  assert.equal(c[0].b.title, "Choir practice");
  assert.equal(c[0].b.pending, true);
  assert.equal(c[0].b.href, "/admin/reservations/r1");
});

test("court rentals sharing the Gym aren't a clash, but an event in the Gym is", () => {
  const rentals = rentalsAsGymBookings([
    { id: "c1", renter_name: "Ana", contact_mobile: "0917", sport: "pickleball", booked_on: D, start_hour: 9, hours: 2, court_numbers: [1], status: "confirmed" },
    { id: "c2", renter_name: "Ben", contact_mobile: "0918", sport: "pickleball", booked_on: D, start_hour: 9, hours: 1, court_numbers: [2], status: "confirmed" },
  ]);
  assert.equal(clashesOn(D, [], rentals).length, 0);
  const c = clashesOn(D, [ev("g", "Sports fest", "2026-11-18T01:30:00Z", "2026-11-18T02:30:00Z", "Gym")], rentals);
  assert.equal(c.length, 2);
  assert.ok(c.every((x) => x.roomName === "Gym" && (x.a.kind === "rental" || x.b.kind === "rental")));
});

test("an all-day event clashes with anything in its room that day", () => {
  const c = clashesOn(
    D,
    [
      { ...ev("a", "Retreat", "2026-11-18T00:00:00Z", null, "Welcome Center"), dates: [{ starts_at: "2026-11-18T00:00:00Z", ends_at: null, all_day: true }] },
      ev("b", "Orientation", "2026-11-18T06:00:00Z", "2026-11-18T07:00:00Z", "Welcome Center"),
    ],
    [],
  );
  assert.equal(c.length, 1);
});

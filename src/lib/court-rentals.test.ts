import assert from "node:assert/strict";
import test from "node:test";

import {
  COURT_POLICIES,
  courtsLabel,
  freeCourts,
  moveError,
  openStarts,
  parseCourtBooking,
  priceOf,
  rentalDays,
  rentalsAsGymBookings,
  sportsOn,
  timeRange,
  type CourtHold,
} from "./court-rentals";

// 2026-10-20 is a Tuesday.
const TUE = "2026-10-20";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

const good = {
  date: "2026-10-22", // Thursday: pickleball all day
  sport: "pickleball",
  start: "18",
  hours: "2",
  courts: "2",
  renter_name: "Ana Reyes",
  contact_mobile: "09171234567",
  renter_email: "Ana@Example.com",
  ...Object.fromEntries(COURT_POLICIES.map((p) => [`policy_${p.id}`, "on"])),
};

test("prices: ₱450 a court an hour for pickleball and badminton, ₱1,800 an hour for the whole floor", () => {
  assert.equal(priceOf("pickleball", 2, 3), 2700);
  assert.equal(priceOf("badminton", 1, 1), 450);
  assert.equal(priceOf("volleyball", 1, 2), 3600);
  assert.equal(priceOf("basketball", 1, 1), 1800);
});

test("the schedule follows Adrian's sheet: no rentals on Monday or Saturday, two sports on Tuesday", () => {
  assert.deepEqual(sportsOn("2026-10-19").map((s) => s.id), []); // Monday
  assert.deepEqual(sportsOn("2026-10-24").map((s) => s.id), []); // Saturday
  assert.deepEqual(sportsOn(TUE).map((s) => s.id), ["badminton", "volleyball"]);
  assert.deepEqual(sportsOn("2026-10-23").map((s) => s.id), ["basketball"]); // Friday
  assert.deepEqual(sportsOn("2026-10-25").map((s) => s.id), ["pickleball"]); // Sunday
});

test("new rentals are for tomorrow to a week ahead; moves may use today", () => {
  assert.deepEqual(rentalDays(TUE), ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-25", "2026-10-27"]);
  assert.equal(rentalDays(TUE, true)[0], TUE);
});

test("start times stay inside one window and skip hours already taken", () => {
  // Sunday pickleball: 12 NN–2 PM and 5–10 PM. A 2-hour booking fits at 12, 17…20.
  assert.deepEqual(openStarts("pickleball", "2026-10-25", 2, 1, []), [12, 17, 18, 19, 20]);
  // Tuesday volleyball 7 AM–1 PM: 3 hours can start 7…10.
  assert.deepEqual(openStarts("volleyball", TUE, 3, 1, []), [7, 8, 9, 10]);
  // Volleyball has one court: an hour held blocks every booking that covers it.
  const held: CourtHold[] = [{ date: TUE, hour: 9, court: 1 }];
  assert.deepEqual(openStarts("volleyball", TUE, 2, 1, held), [7, 10, 11]);
  // Today, only hours that haven't started.
  assert.deepEqual(openStarts("volleyball", TUE, 1, 1, [], 10), [11, 12]);
});

test("three pickleball courts: two can be held and one still rented; a block closes them all", () => {
  const holds: CourtHold[] = [
    { date: "2026-10-22", hour: 18, court: 1 },
    { date: "2026-10-22", hour: 18, court: 2 },
  ];
  assert.equal(freeCourts("pickleball", "2026-10-22", 18, holds), 1);
  assert.deepEqual(openStarts("pickleball", "2026-10-22", 1, 2, holds).includes(18), false);
  assert.deepEqual(openStarts("pickleball", "2026-10-22", 1, 1, holds).includes(18), true);
  const blocked: CourtHold[] = [{ date: "2026-10-22", hour: 18, court: 0 }];
  assert.equal(freeCourts("pickleball", "2026-10-22", 18, blocked), 0);
});

test("a good booking passes, with the email lowercased and the mobile tidied", () => {
  const r = parseCourtBooking(form(good), TUE);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.value, {
    sport: "pickleball",
    date: "2026-10-22",
    start: 18,
    hours: 2,
    courts: 2,
    renterName: "Ana Reyes",
    contactMobile: "0917 123 4567",
    renterEmail: "ana@example.com",
  });
});

test("bookings outside the schedule, too long, for today, or without the rules ticked are refused", () => {
  const bad = (over: Record<string, string>) => {
    const r = parseCourtBooking(form({ ...good, ...over }), TUE);
    return r.ok ? {} : r.fieldErrors;
  };
  assert.ok(bad({ date: TUE }).date, "not today");
  assert.ok(bad({ date: "2026-10-29" }).date, "more than a week ahead");
  assert.ok(bad({ sport: "basketball" }).sport, "basketball is Friday only");
  assert.ok(bad({ hours: "4" }).hours);
  assert.ok(bad({ start: "21" }).start, "9 PM + 2 hours runs past 10 PM");
  assert.ok(bad({ courts: "4" }).courts);
  assert.ok(bad({ policy_payment: "" }).policies);
  assert.ok(bad({ policy_floor: "" }).policies, "every rule, not just the first two");
  // Volleyball and basketball are always one court, whatever the form says.
  const v = parseCourtBooking(form({ ...good, date: "2026-10-27", sport: "volleyball", start: "7", courts: "3" }), TUE);
  assert.equal(v.ok && v.value.courts, 1);
});

test("a rental moves within a week, for its own sport, until it starts", () => {
  const r = { sport: "pickleball", booked_on: "2026-10-22", start_hour: 18, hours: 2 };
  assert.equal(moveError(r, { date: "2026-10-22", start: 19 }, TUE, 9), null);
  assert.equal(moveError(r, { date: "2026-10-25", start: 12 }, TUE, 9), null, "Sunday pickleball");
  assert.ok(moveError(r, { date: "2026-10-23", start: 9 }, TUE, 9), "Friday is basketball");
  assert.ok(moveError(r, { date: "2026-10-25", start: 13 }, TUE, 9), "12–2 PM can't fit 1–3 PM");
  assert.ok(moveError(r, { date: "2026-10-22", start: 18 }, TUE, 9), "same time");
  // On the day itself it can still move, to a time that hasn't started.
  assert.equal(moveError(r, { date: "2026-10-22", start: 20 }, "2026-10-22", 15), null);
  assert.ok(moveError(r, { date: "2026-10-22", start: 15 }, "2026-10-22", 15));
  // Once it has started, it can't.
  assert.ok(moveError(r, { date: "2026-10-22", start: 20 }, "2026-10-22", 18));
});

test("labels read the way people say them", () => {
  assert.equal(timeRange(11, 2), "11:00 AM – 1:00 PM");
  assert.equal(timeRange(10, 2), "10:00 AM – 12 NN");
  assert.equal(courtsLabel("pickleball", [2, 1]), "Courts 1 & 2");
  assert.equal(courtsLabel("badminton", [3]), "Court 3");
  assert.equal(courtsLabel("basketball", [1]), "The whole court");
});

test("rentals show on the Gym's boards at their Manila times, and cancelled ones don't", () => {
  const [b, ...rest] = rentalsAsGymBookings([
    { id: "r1", renter_name: "Ana", contact_mobile: "0917", sport: "badminton", booked_on: TUE, start_hour: 19, hours: 2, court_numbers: [1, 2], status: "confirmed" },
    { id: "r2", renter_name: "Ben", contact_mobile: "0918", sport: "badminton", booked_on: TUE, start_hour: 13, hours: 1, court_numbers: [1], status: "cancelled" },
  ]);
  assert.equal(rest.length, 0);
  assert.equal(b.facility_slug, "sports-hall");
  assert.equal(b.starts_at, "2026-10-20T11:00:00.000Z");
  assert.equal(b.ends_at, "2026-10-20T13:00:00.000Z");
  assert.equal(b.activity_name, "Badminton · Courts 1 & 2");
  assert.equal(b.href, "/admin/courts/r1");
});

test("a Gym block or a Gym event closes every court for the hours it touches", async () => {
  const { gymClosures } = await import("./court-closures");
  const hours = (hs: { hour: number }[]) => [...new Set(hs.map((h) => h.hour))].sort((a, b) => a - b);
  // A block 9:30 to 11 AM on Thursday closes 9 and 10; another room's block doesn't count.
  const blocks = [
    { starts_at: "2026-10-22T01:30:00Z", ends_at: "2026-10-22T03:00:00Z", facility_slug: "sports-hall" },
    { starts_at: "2026-10-22T05:00:00Z", ends_at: "2026-10-22T06:00:00Z", facility_slug: "welcome-center" },
  ];
  assert.deepEqual(hours(gymClosures(blocks, [], ["2026-10-22"])), [9, 10]);
  // An event in the Gym from 6 to 8 PM closes 18 and 19; one in the Main Hall doesn't.
  const events = [
    { id: "e1", title: "Sports Fest", starts_at: "2026-10-22T10:00:00Z", ends_at: "2026-10-22T12:00:00Z", location_note: "Gym" },
    { id: "e2", title: "Prayer night", starts_at: "2026-10-22T10:00:00Z", ends_at: "2026-10-22T12:00:00Z", location_note: "Main Hall" },
  ];
  const closed = gymClosures([], events, ["2026-10-22"]);
  assert.deepEqual(hours(closed), [18, 19]);
  assert.ok(closed.every((h) => h.court === 0));
  assert.equal(freeCourts("pickleball", "2026-10-22", 18, closed), 0);
});

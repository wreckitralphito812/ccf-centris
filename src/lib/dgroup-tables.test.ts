import assert from "node:assert/strict";
import test from "node:test";

import {
  BOOKING_DAYS_AHEAD,
  bookableNights,
  candidateTables,
  DGROUP_POLICIES,
  DGROUP_ROOMS,
  MAX_GROUP_SIZE,
  openSlots,
  parseDgroupBooking,
  parseDgroupChange,
  rebookDate,
  slotAvailability,
  tableGroups,
  tableKey,
  tablesLabel,
  withAvailability,
} from "./dgroup-tables";

const none = new Set<string>();
const room = (slug: string) => DGROUP_ROOMS.find((r) => r.slug === slug)!;
const seatsOf = (slug: string) => room(slug).tables.reduce((n, t) => n + t.seats, 0);
const key = (c: { roomSlug: string; labels: string[] }) => `${c.roomSlug}:${c.labels.join("+")}`;

test("the tables match the CCF Centris floor plans", () => {
  const lounge = room("dgroup-lounge");
  assert.equal(lounge.tables.length, 11);
  assert.equal(seatsOf("dgroup-lounge"), 38);
  assert.equal(lounge.tables.find((t) => t.label === "1")?.seats, 8);
  assert.equal(lounge.tables.find((t) => t.label === "7")?.seats, 3);
  assert.equal(lounge.tables.find((t) => t.label === "11")?.seats, 2);

  const welcome = room("welcome-center");
  assert.equal(welcome.tables.length, 15);
  assert.equal(seatsOf("welcome-center"), 60);
});

test("every join names two real tables in its room", () => {
  for (const r of DGROUP_ROOMS) {
    const labels = new Set(r.tables.map((t) => t.label));
    for (const [a, b] of r.joins) assert.ok(labels.has(a) && labels.has(b), `${r.slug} ${a}-${b}`);
  }
});

test("the lounge 8-seater and the Welcome Center wall sets never join the rest", () => {
  const groups = (slug: string) => tableGroups(room(slug)).filter((g) => g.length > 1);
  assert.ok(groups("dgroup-lounge").every((g) => !g.includes("1")));
  const wall = new Set(["1", "2", "3"]);
  for (const g of groups("welcome-center")) {
    const onWall = g.filter((l) => wall.has(l)).length;
    assert.ok(onWall === 0 || onWall === g.length, `mixed group ${g}`);
  }
});

test("joined tables are always neighbours", () => {
  const welcome = room("welcome-center");
  const groups = tableGroups(welcome).map((g) => g.join("+"));
  assert.ok(groups.includes("4+5"));
  assert.ok(groups.includes("4+10"));
  assert.ok(groups.includes("4+5+6"));
  assert.ok(!groups.includes("4+6"), "4 and 6 aren't next to each other");
  assert.ok(!groups.includes("3+4"), "the wall sets don't join the clusters");
});

test("one table when one fits, the smallest one", () => {
  assert.deepEqual(key(candidateTables(2, none)[0]), "dgroup-lounge:8");
  assert.deepEqual(key(candidateTables(3, none)[0]), "dgroup-lounge:6");
  assert.deepEqual(key(candidateTables(4, none)[0]), "dgroup-lounge:2");
  assert.deepEqual(key(candidateTables(6, none)[0]), "dgroup-lounge:1");
});

test("joins neighbouring tables only when no single table fits", () => {
  const taken = new Set([tableKey("dgroup-lounge", "1")]);
  const best = candidateTables(6, taken)[0];
  assert.equal(best.labels.length, 2);
  assert.ok(best.seats >= 6);

  const twelve = candidateTables(12, none)[0];
  assert.equal(twelve.seats, 12);
  assert.equal(twelve.labels.length, 3);
});

test("skips tables already booked, room by room", () => {
  const taken = new Set([tableKey("dgroup-lounge", "8")]);
  assert.equal(key(candidateTables(2, taken)[0]), "dgroup-lounge:9");
  // Table 8 in the lounge doesn't block Table 8 in the Welcome Center.
  const all = candidateTables(4, taken).map(key);
  assert.ok(all.includes("welcome-center:8"));
});

test("a set is offered only when every table in it is free", () => {
  const taken = new Set([tableKey("welcome-center", "5")]);
  const sets = candidateTables(8, taken).filter((c) => c.roomSlug === "welcome-center");
  assert.ok(sets.every((c) => !c.labels.includes("5")));
});

test("a full slot never hands the same table out twice", () => {
  const taken = new Set<string>();
  const sizes = [2, 8, 5, 4, 12, 3, 6, 4, 4, 2, 10, 4, 7, 4, 4, 1, 3];
  for (const size of sizes) {
    const pick = candidateTables(size, taken)[0];
    if (!pick) continue;
    assert.ok(pick.seats >= size);
    for (const l of pick.labels) {
      const k = tableKey(pick.roomSlug, l);
      assert.ok(!taken.has(k), `${k} handed out twice`);
      taken.add(k);
    }
  }
});

test("offers nothing past the group limit", () => {
  assert.equal(MAX_GROUP_SIZE, 12);
  assert.deepEqual(candidateTables(13, none), []);
});

test("any weeknight up to 8 days ahead can be booked", () => {
  // Ralph, 2026-10-10: a rolling window, not a week that opens on Sunday.
  assert.equal(BOOKING_DAYS_AHEAD, 8);
  // Wednesday Oct 7 -> through Thursday Oct 15, weekdays only.
  assert.deepEqual(bookableNights("2026-10-07"), [
    "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15",
  ]);
  // Saturday Oct 10 -> through Sunday Oct 18: Monday Oct 12 to Friday Oct 16.
  assert.deepEqual(bookableNights("2026-10-10"), ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]);
  // Sunday Oct 4 -> Monday Oct 5 to Monday Oct 12.
  assert.deepEqual(bookableNights("2026-10-04"), [
    "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12",
  ]);
});

test("today's slots close once they start", () => {
  const today = "2026-10-07";
  assert.equal(openSlots(today, today, 12 * 60).length, 3);
  assert.deepEqual(openSlots(today, today, 13 * 60 + 5).map((s) => s.id), ["1600", "1900"]);
  assert.equal(openSlots(today, today, 19 * 60).length, 0);
  assert.equal(openSlots("2026-10-08", today, 23 * 60).length, 3);
});

test("labels read naturally", () => {
  assert.equal(tablesLabel(["4"]), "Table 4");
  assert.equal(tablesLabel(["4", "5"]), "Tables 4 + 5");
});

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const complete = {
  date: "2026-10-08",
  slot: "1900",
  leader_name: "  Ana   Cruz ",
  contact_mobile: "0917 123 4567",
  leader_email: "Ana@Example.com",
  group_size: "6",
  ...Object.fromEntries(DGROUP_POLICIES.map((p) => [`policy_${p.id}`, "on"])),
};

test("a complete booking parses", () => {
  const r = parseDgroupBooking(form(complete), "2026-10-07", 10 * 60);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.leaderName, "Ana Cruz");
    assert.equal(r.value.leaderEmail, "ana@example.com");
    assert.equal(r.value.groupSize, 6);
  }
});

test("every policy must be accepted", () => {
  const r = parseDgroupBooking(form({ ...complete, policy_claygo: "" }), "2026-10-07", 600);
  assert.ok(!r.ok && r.fieldErrors.policies);
});

test("rejects a day past the 8-day window, a bad email, and a group over 12", () => {
  const r = parseDgroupBooking(
    form({ ...complete, date: "2026-10-16", leader_email: "nope", group_size: "13" }),
    "2026-10-07",
    600,
  );
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.ok(r.fieldErrors.date);
    assert.ok(r.fieldErrors.leaderEmail);
    assert.ok(r.fieldErrors.groupSize);
  }
});

test("a change needs only the day, time, and headcount", () => {
  const r = parseDgroupChange(form({ date: "2026-10-09", slot: "1300", group_size: "3" }), "2026-10-07", 600);
  assert.ok(r.ok);
});

test("an empty slot has every table free and seats the largest group", () => {
  assert.deepEqual(slotAvailability(none), { free: 26, fits: MAX_GROUP_SIZE });
});

test("a slot with every table held is full", () => {
  const all = new Set(DGROUP_ROOMS.flatMap((r) => r.tables.map((t) => tableKey(r.slug, t.label))));
  assert.deepEqual(slotAvailability(all), { free: 0, fits: 0 });
});

test("fits follows the tables left, not the seat count", () => {
  // Leave only lounge tables 8 and 9 (two 2-seat rounds that join): 4 seats.
  const lounge = room("dgroup-lounge");
  const keep = new Set(["8", "9"]);
  const taken = new Set([
    ...lounge.tables.filter((t) => !keep.has(t.label)).map((t) => tableKey(lounge.slug, t.label)),
    ...room("welcome-center").tables.map((t) => tableKey("welcome-center", t.label)),
  ]);
  assert.deepEqual(slotAvailability(taken), { free: 2, fits: 4 });
});

test("availability is counted per day and slot", () => {
  const nights = [
    { date: "2026-10-05", label: "Monday, Oct 5", slots: [{ id: "1300", label: "" }, { id: "1600", label: "" }] },
  ];
  const [n] = withAvailability(nights, [
    { booked_on: "2026-10-05", slot_id: "1300", room_slug: "dgroup-lounge", table_labels: ["2", "3"] },
    { booked_on: "2026-10-06", slot_id: "1300", room_slug: "dgroup-lounge", table_labels: ["4"] },
  ]);
  assert.equal(n.slots[0].free, 24);
  assert.equal(n.slots[1].free, 26);
});

test("book again lands on the next open date with the same weekday and slot", () => {
  // Booked Wed Oct 7, 4 PM. The next day, the following Wednesday is within 8 days.
  assert.equal(rebookDate("2026-10-07", "1600", "2026-10-08", 600), "2026-10-14");
  // A Monday booking, looked at a few days later: the coming Monday.
  assert.equal(rebookDate("2026-10-05", "1300", "2026-10-08", 600), "2026-10-12");
  // That Monday itself, after the slot has started: next Monday is 7 days on.
  assert.equal(rebookDate("2026-10-05", "1300", "2026-10-12", 14 * 60), "2026-10-19");
  // Looked at the same day: next Monday is 7 days on, inside the window.
  assert.equal(rebookDate("2026-10-05", "1300", "2026-10-05", 14 * 60), "2026-10-12");
});

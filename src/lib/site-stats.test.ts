import assert from "node:assert/strict";
import test from "node:test";

import { buildSiteStats, type StatsInput } from "./site-stats";

const now = new Date("2026-10-03T04:00:00Z"); // noon Manila, Saturday
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

const base: StatsInput = { today: "2026-10-03", now, members: { total: 40, joined30: 12 }, tables: [], rooms: [], posts: [], prayers: 0 };

const t = (o: Partial<StatsInput["tables"][number]>) => ({
  status: "confirmed", booked_on: "2026-09-29", slot_id: "1600", room_slug: "dgroup-lounge", group_size: 6, created_at: ago(5), ...o,
});
const r = (o: Partial<StatsInput["rooms"][number]>) => ({
  id: "r", status: "pending", created_at: ago(3), starts_at: "2026-10-10T01:00:00Z", facility_name: "John (MPH 1)", request_group: null, ...o,
});

test("an empty database gives zeros and no busiest anything", () => {
  const s = buildSiteStats(base);
  assert.equal(s.tables.upcoming, 0);
  assert.equal(s.tables.cancelRate, null);
  assert.equal(s.tables.busiestSlot, null);
  assert.equal(s.rooms.topRoom, null);
  assert.equal(s.members.total, 40);
});

test("table stats count upcoming, recent people, cancellations and the busiest slot and day", () => {
  const s = buildSiteStats({
    ...base,
    tables: [
      t({ booked_on: "2026-10-05" }), // upcoming Monday
      t({ booked_on: "2026-09-29", group_size: 8 }), // Tuesday, 4 PM
      t({ booked_on: "2026-09-29", slot_id: "1900", room_slug: "welcome-center" }),
      t({ booked_on: "2026-09-22", group_size: 4 }), // Tuesday
      t({ status: "cancelled", booked_on: "2026-09-30" }),
    ],
  });
  assert.equal(s.tables.upcoming, 1);
  assert.equal(s.tables.booked30, 5);
  assert.equal(s.tables.people30, 8 + 6 + 4);
  assert.equal(s.tables.cancelRate, 20);
  assert.equal(s.tables.busiestSlot, "4:00 PM");
  assert.equal(s.tables.busiestDay, "Tuesday");
  assert.equal(s.tables.lounge, 2);
  assert.equal(s.tables.welcome, 1);
});

test("a request for several rooms counts once; the most asked-for room wins", () => {
  const s = buildSiteStats({
    ...base,
    rooms: [
      r({ id: "a", request_group: "g1" }),
      r({ id: "b", request_group: "g1", facility_name: "Luke (MPH 2)" }),
      r({ id: "c", status: "approved" }),
      r({ id: "d", status: "approved", starts_at: "2026-09-01T01:00:00Z", created_at: ago(60) }),
    ],
  });
  assert.equal(s.rooms.requests30, 2);
  assert.equal(s.rooms.awaiting, 1);
  assert.equal(s.rooms.approvedAhead, 1);
  assert.equal(s.rooms.topRoom, "John (MPH 1)");
});

test("the Prayer Wall counts open, recent and answered requests", () => {
  const s = buildSiteStats({
    ...base,
    prayers: 17,
    posts: [
      { created_at: ago(2), expires_at: "2026-12-01T00:00:00Z", hidden_at: null, answered_at: null },
      { created_at: ago(40), expires_at: "2026-11-20T00:00:00Z", hidden_at: null, answered_at: ago(1) },
      { created_at: ago(3), expires_at: "2026-12-01T00:00:00Z", hidden_at: ago(1), answered_at: null },
      { created_at: ago(70), expires_at: ago(10), hidden_at: null, answered_at: null },
    ],
  });
  assert.equal(s.prayer.open, 2);
  assert.equal(s.prayer.posted30, 2);
  assert.equal(s.prayer.answered, 1);
  assert.equal(s.prayer.prayers, 17);
});

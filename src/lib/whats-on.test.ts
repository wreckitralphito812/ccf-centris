import assert from "node:assert/strict";
import test from "node:test";

import type { CcfEvent } from "./types";
import { featuredEvent, weekAgenda } from "./whats-on";

const base = {
  summary: null,
  description: null,
  category: "Events",
  location_note: "CCF Centris",
  organizer: null,
  capacity: null,
  seats_taken: 0,
  requires_registration: false,
  price_cents: 0,
  currency: "PHP",
  requirements: null,
  community_slug: null,
  registration_url: null,
  fee_note: null,
  artwork: {},
  status: "published",
  calendar_only: false,
  cover_image_url: "https://x.public.blob.vercel-storage.com/announcements/p.jpg",
};
const ev = (slug: string, dates: { starts_at: string; ends_at: string | null; all_day?: boolean }[], over: Partial<CcfEvent> = {}): CcfEvent =>
  ({ ...base, id: slug, slug, title: slug, starts_at: dates[0].starts_at, ends_at: dates[dates.length - 1].ends_at, dates, ...over }) as CcfEvent;

// Thu 2026-10-15, Manila.
const today = "2026-10-15";
const services = [
  { starts_at: "2026-10-18T02:00:00Z", title: "Sunday Service" }, // 10:00 AM Sun
  { starts_at: "2026-10-18T07:00:00Z", title: "Sunday Service" }, // 3:00 PM Sun
  { starts_at: "2026-10-25T02:00:00Z", title: "Sunday Service" }, // next week: out
];

test("the week shows services, events and bookings by day, empty days left out", () => {
  const days = weekAgenda({
    today,
    services,
    events: [
      ev("love-triangle", [{ starts_at: "2026-10-15T16:00:00Z", ends_at: "2026-10-18T15:59:00Z", all_day: true }]), // Fri–Sun all day
      ev("in-his-presence", [{ starts_at: "2026-10-17T11:00:00Z", ends_at: null }]), // Sat 7 PM
      ev("focig", [{ starts_at: "2026-10-20T16:00:00Z", ends_at: "2026-10-21T15:59:00Z", all_day: true }], { calendar_only: true }), // Wed
      ev("later", [{ starts_at: "2026-11-01T11:00:00Z", ends_at: null }]),
    ],
  });
  assert.deepEqual(
    days.map((d) => d.key),
    ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-21"],
  );
  const sat = days[1].items.map((i) => `${i.time ?? "all day"} ${i.title}`);
  assert.deepEqual(sat, ["all day love-triangle", "7:00 PM in-his-presence"]);
  const sun = days[2].items.map((i) => `${i.time ?? "all day"} ${i.title} ${i.kind}`);
  assert.deepEqual(sun, ["all day love-triangle event", "10:00 AM Sunday Service service", "3:00 PM Sunday Service service"]);
  const wed = days[3].items[0];
  assert.equal(wed.kind, "booked");
  assert.equal(wed.href, null);
});

test("the featured event is the soonest promoted one with a poster, within two weeks", () => {
  const now = new Date("2026-10-15T04:00:00Z");
  const events = [
    ev("far", [{ starts_at: "2026-11-07T00:00:00Z", ends_at: "2026-11-07T09:00:00Z" }]),
    ev("booked", [{ starts_at: "2026-10-16T00:00:00Z", ends_at: null }], { calendar_only: true }),
    ev("no-poster", [{ starts_at: "2026-10-16T00:00:00Z", ends_at: null }], { cover_image_url: null }),
    ev("hidden", [{ starts_at: "2026-10-16T00:00:00Z", ends_at: null }], { status: "draft" }),
    ev("series", [
      { starts_at: "2026-10-10T07:30:00Z", ends_at: null },
      { starts_at: "2026-10-24T07:30:00Z", ends_at: null },
    ]),
    ev("retreat", [{ starts_at: "2026-10-20T16:00:00Z", ends_at: "2026-10-22T15:59:00Z", all_day: true }]),
  ];
  const f = featuredEvent(events, now);
  assert.equal(f?.event.slug, "retreat");
  assert.equal(f?.happeningNow, false);
  // A series shows its next date, not the one that has passed.
  assert.equal(featuredEvent([events[4]], now)?.next.starts_at, "2026-10-24T07:30:00Z");
  // Nothing within two weeks: no banner.
  assert.equal(featuredEvent([events[0]], now), null);
});

test("an event already under way is happening now", () => {
  const f = featuredEvent(
    [ev("retreat", [{ starts_at: "2026-10-15T16:00:00Z", ends_at: "2026-10-18T15:59:00Z", all_day: true }])],
    new Date("2026-10-17T03:00:00Z"),
  );
  assert.equal(f?.happeningNow, true);
});

test("the full week can include its quiet days", () => {
  const days = weekAgenda({ today, services, events: [], includeEmpty: true });
  assert.deepEqual(days.map((d) => `${d.key}:${d.items.length}`), [
    "2026-10-15:0", "2026-10-16:0", "2026-10-17:0", "2026-10-18:2", "2026-10-19:0", "2026-10-20:0", "2026-10-21:0",
  ]);
});

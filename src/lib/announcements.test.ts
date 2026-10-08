import assert from "node:assert/strict";
import test from "node:test";

import { dateText, daysCovered, downloadName, isOurUpload, lastEnd, parseAnnouncement, shapeCheck, slugFor } from "./announcements";

const BLOB = "https://abc123.public.blob.vercel-storage.com/announcements/main-tv-x1y2.jpg";

function form(over: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    title: "Family Camp Lite",
    ministry: "ACROSS · CCF North EDSA",
    category: "Events",
    venue: "Main Hall",
    summary: "A day for the whole family: worship, talks, games and meals.",
    date: ["2026-11-07"],
    start: ["08:00"],
    end: ["17:00"],
    signup: "link",
    registration_url: "https://forms.gle/abc",
    fee: "paid",
    fee_note: "₱600 adults and teens, ₱400 kids, free for 6 and below",
    artwork_main_tv: BLOB,
    ...over,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}

test("a complete submission parses into Manila times and keeps the facts", () => {
  const r = parseAnnouncement(form(), "2026-10-05");
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.dates[0].startsAt, "2026-11-07T00:00:00.000Z");
  assert.equal(r.value.dates[0].endsAt, "2026-11-07T09:00:00.000Z");
  assert.equal(r.value.registrationUrl, "https://forms.gle/abc");
  assert.equal(r.value.artwork.main_tv, BLOB);
});

test("a series keeps every date, soonest first", () => {
  const r = parseAnnouncement(
    form({ date: ["2026-11-14", "2026-10-10", "2026-11-07"], start: ["15:30", "15:30", "15:30"], end: ["18:00", "18:00", "18:00"] }),
    "2026-10-05",
  );
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value.dates.map((d) => d.startsAt.slice(0, 10)), ["2026-10-10", "2026-11-07", "2026-11-14"]);
});

test("missing or wrong facts come back as plain messages", () => {
  const r = parseAnnouncement(
    form({ title: "", summary: "short", date: ["2026-10-01"], registration_url: "forms.gle/abc", fee_note: "", artwork_main_tv: "" }),
    "2026-10-05",
  );
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.errors.title && r.errors.summary && r.errors.dates && r.errors.registration && r.errors.fee && r.errors.artwork);
});

test("no sign-up and free need nothing more; Other venue needs a name", () => {
  const ok = parseAnnouncement(form({ signup: "none", registration_url: "", fee: "free", fee_note: "" }), "2026-10-05");
  assert.ok(ok.ok);
  if (ok.ok) assert.equal(ok.value.registrationUrl, null);
  const bad = parseAnnouncement(form({ venue: "Other", venue_other: "" }), "2026-10-05");
  assert.equal(bad.ok, false);
});

test("only files from our own upload store are accepted", () => {
  assert.equal(isOurUpload(BLOB), true);
  assert.equal(isOurUpload("https://evil.example.com/x.jpg"), false);
  const r = parseAnnouncement(form({ artwork_led: "https://drive.google.com/x" }), "2026-10-05");
  assert.equal(r.ok, false);
});

test("pictures are checked against their screen's shape", () => {
  assert.equal(shapeCheck("main_tv", 1920, 1080).level, "ok");
  assert.equal(shapeCheck("main_tv", 1080, 1920).level, "error");
  assert.equal(shapeCheck("led", 4608, 1344).level, "ok");
  assert.equal(shapeCheck("social", 540, 675).level, "warn");
});

test("slugs and download names read cleanly", () => {
  assert.equal(slugFor("Family Camp Lite: H.O.W.M.E.", "2026-11-07", "4f3a9c2e-0000"), "family-camp-lite-h-o-w-m-e-2026-11-07-4f3a");
  assert.equal(downloadName("Family Camp Lite", "2026-11-07", "led", BLOB), "2026-11-07 Family Camp Lite – Main Hall LED.jpg");
  assert.equal(lastEnd([{ startsAt: "2026-10-10T07:30:00Z", endsAt: "2026-10-10T10:00:00Z" }, { startsAt: "2026-11-14T07:30:00Z", endsAt: null }]), "2026-11-14T07:30:00Z");
});

test("all-day dates span whole Manila days, and can run over several", () => {
  const r = parseAnnouncement(
    form({ date: ["2026-10-16", "2026-10-24"], start: ["", ""], end: ["", ""], allday: ["1", "1"], until: ["2026-10-18", ""] }),
    "2026-10-06",
  );
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.value.dates[0], { startsAt: "2026-10-15T16:00:00.000Z", endsAt: "2026-10-18T15:59:00.000Z", allDay: true });
  assert.equal(r.value.dates[1].endsAt, "2026-10-24T15:59:00.000Z");
});

test("a start time alone is fine: it reads as 'onwards'", () => {
  const r = parseAnnouncement(form({ date: ["2026-10-17"], start: ["19:00"], end: [""] }), "2026-10-06");
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.dates[0].endsAt, null);
});

test("admins can post without artwork; descriptions keep their paragraphs", () => {
  const r = parseAnnouncement(form({ artwork_main_tv: "", description: "First line.\n\n\n\nSecond." }), "2026-10-06", { artworkRequired: false });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.description, "First line.\n\nSecond.");
});

test("dates read the way people say them", () => {
  assert.equal(dateText({ starts_at: "2026-11-07T00:00:00Z", ends_at: "2026-11-07T09:00:00Z" }), "Sat, Nov 7, 8:00 AM – 5:00 PM");
  assert.equal(dateText({ starts_at: "2026-10-10T07:30:00Z", ends_at: null }), "Sat, Oct 10, 3:30 PM onwards");
  assert.equal(dateText({ starts_at: "2026-10-15T16:00:00Z", ends_at: "2026-10-18T15:59:00Z", all_day: true }), "Fri, Oct 16 – Sun, Oct 18");
  assert.equal(dateText({ starts_at: "2026-10-23T16:00:00Z", ends_at: "2026-10-24T15:59:00Z", all_day: true }), "Sat, Oct 24 · All day");
  assert.deepEqual(daysCovered({ starts_at: "2026-10-15T16:00:00Z", ends_at: "2026-10-18T15:59:00Z", all_day: true }), ["2026-10-16", "2026-10-17", "2026-10-18"]);
});

test("admins can keep dates that have passed, for a series already under way", () => {
  const series = form({ date: ["2026-10-10", "2026-11-07"], start: ["15:30", "15:30"], end: ["", ""] });
  assert.equal(parseAnnouncement(series, "2026-10-20").ok, false);
  assert.ok(parseAnnouncement(series, "2026-10-20", { allowPast: true }).ok);
});

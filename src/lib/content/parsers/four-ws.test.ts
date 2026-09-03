import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseFourWsGuide, parseFourWsIndex } from "./four-ws";

const OBSERVED_AT = "2026-09-04T00:00:00.000Z";
const fixture = (n: string) =>
  readFileSync(join(__dirname, "..", "__fixtures__", n), "utf8");

const src = (u: string) => ({
  sourceUrl: u,
  canonicalUrl: u,
  resolvedUrl: u,
  sourceModifiedAt: null,
  fetchedAt: OBSERVED_AT,
  checksum: "test",
  parserVersion: "test",
});

test("index pairs a standard and GoViral edition per week, with its date", () => {
  const { records } = parseFourWsIndex(
    fixture("four-ws-index.html"),
    src("https://www.ccf.org.ph/4ws/"),
    OBSERVED_AT,
  );
  const wk = records[0];
  assert.equal(wk.slug, "4ws-our-extraordinary-god-is-our-shepherd-follow-him");
  assert.equal(wk.title, "Our Extraordinary God Is Our Shepherd, Follow Him");
  assert.equal(wk.seriesTitle, "Ordinary People, Extraordinary God");
  assert.equal(wk.year, 2026);
  assert.equal(wk.serviceDateLabel, "Aug 29 and 30");
  assert.equal(wk.serviceDate, "2026-08-30");
  assert.equal(
    wk.standardUrl,
    "https://www.ccf.org.ph/4ws-our-extraordinary-god-is-our-shepherd-follow-him/",
  );
  assert.equal(
    wk.goViralUrl,
    "https://www.ccf.org.ph/4ws-our-extraordinary-god-is-our-shepherd-follow-him-goviral-edition/",
  );
});

test("index carries the year down across series and handles a GoViral-less week", () => {
  const { records } = parseFourWsIndex(
    fixture("four-ws-index.html"),
    src("https://www.ccf.org.ph/4ws/"),
    OBSERVED_AT,
  );
  const hope = records.find((r) => r.slug === "4ws-hope-has-a-name");
  assert.ok(hope);
  assert.equal(hope?.year, 2025);
  assert.equal(hope?.seriesTitle, "Hope has a Name");
  assert.equal(hope?.goViralUrl, null);
});

test("guide keeps every section, the date, and the memory verse", () => {
  const { record } = parseFourWsGuide(
    fixture("four-ws.html"),
    src(
      "https://www.ccf.org.ph/4ws-our-extraordinary-god-is-our-shepherd-follow-him-goviral-edition/",
    ),
    OBSERVED_AT,
  );
  assert.equal(record.title, "OUR EXTRAORDINARY GOD IS OUR SHEPHERD: FOLLOW HIM!");
  assert.equal(record.dateLabel, "AUG 30, 2026");
  assert.equal(record.date, "2026-08-30");
  assert.match(record.worshipHtml ?? "", /How Great Thou Art/);
  assert.match(record.welcomeHtml ?? "", /someone you trust to guide you/);
  assert.match(record.wordHtml ?? "", /POINT IT OUT/);
  assert.match(record.worksHtml ?? "", /APPLY IT/);
  assert.match(record.prayerPointsHtml ?? "", /Thanksgiving/);
  assert.equal(record.memoryVerseReference, "Psalm 23:1");
  assert.match(record.memoryVerseText ?? "", /my shepherd/);
});

test("guide strips the section-header images from the section bodies", () => {
  const { record } = parseFourWsGuide(
    fixture("four-ws.html"),
    src("https://www.ccf.org.ph/4ws-x/"),
    OBSERVED_AT,
  );
  assert.doesNotMatch(record.worshipHtml ?? "", /Worship\.png/);
  assert.doesNotMatch(record.wordHtml ?? "", /<img/);
});

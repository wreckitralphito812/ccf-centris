import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  parseChroniclePage,
  parseIntercedePage,
  parseResourcesPage,
  parseScriptureMemoryPage,
} from "./resources";

const OBSERVED_AT = "2026-09-04T00:00:00.000Z";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "..", "__fixtures__", name), "utf8");
}

function source(url: string) {
  return {
    sourceUrl: url,
    canonicalUrl: url,
    resolvedUrl: url,
    sourceModifiedAt: null,
    fetchedAt: OBSERVED_AT,
    checksum: "test",
    parserVersion: "test",
  };
}

test("Chronicle identity is the download id, not the download counter", () => {
  const result = parseChroniclePage(
    fixture("chronicle.html"),
    source("https://www.ccf.org.ph/chronicle/"),
    OBSERVED_AT,
  );
  const first = result.records[0];
  assert.equal(first.downloadId, "41950");
  assert.equal(first.seriesTitle, "Ordinary People, Extraordinary God");
  assert.equal(first.serviceDateLabel, "Aug 29 and 30");
  assert.equal(first.serviceDate, "2026-08-30"); // year from run, later day
  assert.equal(
    first.title,
    "Our Extraordinary God Is Our Shepherd, Follow Him",
  );
  assert.match(first.downloadUrl, /^https:\/\/www\.ccf\.org\.ph\/download\/41950\//);
  assert.equal(first.displayedDownloadCount, 23);
  assert.equal(first.downloadCountObservedAt, OBSERVED_AT);
});

test("Chronicle keeps every series and strips the tracking query", () => {
  const result = parseChroniclePage(
    fixture("chronicle.html"),
    source("https://www.ccf.org.ph/chronicle/"),
    OBSERVED_AT,
  );
  const series = new Set(result.records.map((r) => r.seriesTitle));
  assert.deepEqual([...series], [
    "Ordinary People, Extraordinary God",
    "Live Your Purpose; Go Beyond",
    "The LORD is my Shepherd",
  ]);
  assert.doesNotMatch(result.records[0].downloadUrl, /tmstv/);
});

test("Chronicle parses older issues that have no date prefix", () => {
  const result = parseChroniclePage(
    fixture("chronicle.html"),
    source("https://www.ccf.org.ph/chronicle/"),
    OBSERVED_AT,
  );
  const undated = result.records.find((r) => r.downloadId === "30542");
  assert.ok(undated);
  assert.equal(undated?.title, "The LORD is my Shepherd");
  assert.equal(undated?.serviceDateLabel, null);
  assert.equal(undated?.displayedDownloadCount, 30542);

  const noCount = result.records.find((r) => r.downloadId === "30475");
  assert.equal(noCount?.title, "Practice Contentment");
  assert.equal(noCount?.displayedDownloadCount, null);
  assert.equal(result.warnings.length, 0);
});

test("Scripture Memory parses the current week and year", () => {
  const result = parseScriptureMemoryPage(
    fixture("scripture-memory.html"),
    source("https://www.ccf.org.ph/52-week-scripture/"),
    OBSERVED_AT,
  );
  const first = result.records[0];
  assert.equal(first.year, 2026);
  assert.equal(first.week, 35);
  assert.equal(first.reference, "Psalm 23:1");
  assert.equal(first.verseText, "23 The Lord is my shepherd, I shall not want.");
  assert.equal(first.dateLabel, "August 30, 2026");
  assert.equal(first.date, "2026-08-30");
  assert.equal(first.downloadUrl, "https://www.ccf.org.ph/download/41918");
});

test("Scripture Memory carries year down from the heading to later weeks", () => {
  const result = parseScriptureMemoryPage(
    fixture("scripture-memory.html"),
    source("https://www.ccf.org.ph/52-week-scripture/"),
    OBSERVED_AT,
  );
  const w52 = result.records.find((r) => r.week === 52);
  assert.ok(w52);
  assert.equal(w52?.year, 2025);

  const w34 = result.records.find((r) => r.week === 34);
  assert.equal(w34?.year, 2026);
  assert.match(w34?.verseText ?? "", /reward your work/); // pulled from verseList
});

test("Resources split language variants and mark cards without a URL unavailable", () => {
  const result = parseResourcesPage(
    fixture("resources.html"),
    source("https://www.ccf.org.ph/resources/"),
    OBSERVED_AT,
  );
  const en = result.records.find(
    (r) => r.title.includes("best decision") && r.language === "English",
  );
  assert.ok(en);
  assert.equal(en?.format, "Handout");
  assert.equal(en?.external, true); // glc.ccf.org.ph is outside www host
  assert.match(en?.url ?? "", /glc\.ccf\.org\.ph/);
  assert.equal(en?.audience, "How can I know more about God?");

  const fil = result.records.find(
    (r) => r.title.includes("best decision") && r.language === "Filipino",
  );
  assert.ok(fil);
  assert.notEqual(fil?.slug, en?.slug);

  const soon = result.records.find((r) => r.title.startsWith("Coming soon"));
  assert.ok(soon);
  assert.equal(soon?.url, null);
});

test("Intercede keeps the campaign, dates, and sanitized body; drops scripts", () => {
  const result = parseIntercedePage(
    fixture("intercede.html"),
    source("https://www.ccf.org.ph/intercede/"),
    OBSERVED_AT,
  );
  const campaign = result.records[0];
  assert.equal(campaign.campaignTitle, "Intercede Midyear Prayer & Fasting 2026");
  assert.equal(campaign.startDate, "2026-07-01");
  assert.equal(campaign.endDate, "2026-07-04");
  assert.match(campaign.bodyHtml ?? "", /How to fast/);
  assert.doesNotMatch(campaign.bodyHtml ?? "", /<script/);
  assert.equal(campaign.biblePlanUrl, "https://www.ccf.org.ph/intercede/bible-plan/");
  assert.equal(campaign.prayerRequestUrl, "https://www.ccf.org.ph/prayer-request/");
  assert.match(campaign.videoUrl ?? "", /youtube\.com/);
});

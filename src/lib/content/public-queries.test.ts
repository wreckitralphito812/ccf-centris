import assert from "node:assert/strict";
import test from "node:test";

import {
  findResources,
  getChronicleIssues,
  getCurrentIntercede,
  getScriptureMemory,
} from "./public-queries";

test("getChronicleIssues returns synced issues grouped-ready with a service date", async () => {
  const issues = await getChronicleIssues();
  assert.ok(issues.length > 50, "expected many chronicle issues from the snapshot");
  const first = issues[0];
  assert.ok(first.downloadUrl.includes("/download/"));
  assert.ok(first.seriesTitle);
  // every issue that has a label also has a normalized date to show on the card
  const labelled = issues.filter((i) => i.serviceDateLabel);
  assert.ok(labelled.every((i) => i.serviceDate === null || /^\d{4}-\d\d-\d\d$/.test(i.serviceDate)));
});

test("getChronicleIssues can filter to one series", async () => {
  const all = await getChronicleIssues();
  const series = all[0].seriesTitle!;
  const filtered = await getChronicleIssues(series);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((i) => i.seriesTitle === series));
});

test("getScriptureMemory returns weeks newest-first with a week+date", async () => {
  const weeks = await getScriptureMemory();
  assert.ok(weeks.length > 50);
  assert.ok(weeks[0].year >= weeks[weeks.length - 1].year);
  assert.ok(Number.isInteger(weeks[0].week));
  assert.ok(weeks[0].reference);
});

test("getScriptureMemory can filter by year", async () => {
  const weeks = await getScriptureMemory(2026);
  assert.ok(weeks.length > 0);
  assert.ok(weeks.every((w) => w.year === 2026));
});

test("findResources filters by text and language, and keeps unavailable ones flagged", async () => {
  const all = await findResources({});
  assert.ok(all.length > 20);

  const filipino = await findResources({ language: "Filipino" });
  assert.ok(filipino.length > 0);
  assert.ok(filipino.every((r) => r.language === "Filipino"));

  const text = await findResources({ q: "jesus" });
  assert.ok(text.length > 0);
  assert.ok(
    text.every((r) =>
      `${r.title} ${r.description ?? ""}`.toLowerCase().includes("jesus"),
    ),
  );
});

test("getCurrentIntercede returns the campaign with an archived flag", async () => {
  const current = await getCurrentIntercede();
  assert.ok(current);
  assert.ok(current?.campaign.campaignTitle);
  assert.equal(typeof current?.archived, "boolean");
});

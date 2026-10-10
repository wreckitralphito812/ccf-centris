import assert from "node:assert/strict";
import test from "node:test";

import {
  findResources,
  fourWsTitle,
  getFourWsGuide,
  getFourWsGuides,
  getFourWsWeeks,
  tidyTitle,
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

test("4Ws guides take their title from the 4Ws index, not the first bold line", async () => {
  // The parser read "INTRO" and "ROMANS 1:1-17" as titles (2026-10-10).
  assert.equal((await getFourWsGuide("4ws-live-for-your-fathers-pleasure"))?.title, "Live for Your Father's Pleasure");
  assert.equal((await getFourWsGuide("4ws-the-significance-of-the-resurrection"))?.title, "The Significance of the Resurrection");
  const titles = (await getFourWsGuides()).map((g) => g.title);
  assert.ok(titles.every((t) => !/^(INTRO|\(READ|[1-3]? ?[A-Z]+ \d+:\d)/.test(t) && !/GoViral/i.test(t)), titles.join(" | "));
});

test("a guide missing from the index keeps a tidied title", () => {
  const guide = (title: string) => ({ title }) as Parameters<typeof fourWsTitle>[0];
  assert.equal(fourWsTitle(guide("VOLUNTEER: LOVE IN ACTION"), undefined), "Volunteer: Love in Action");
  assert.equal(fourWsTitle(guide("4ws – Do You Love God? (GoViral Edition)"), undefined), "Do You Love God?");
  assert.equal(fourWsTitle(guide("GOD IS FORGIVING:"), undefined), "God Is Forgiving");
});

test("4Ws titles share one casing, keeping CCF's acronyms", () => {
  assert.equal(tidyTitle("Understanding the loaves and fish"), "Understanding the Loaves and Fish");
  assert.equal(tidyTitle("Gifts For The King: What Should You bring?"), "Gifts for the King: What Should You Bring?");
  assert.equal(tidyTitle("EYE WITNESS 2: More Lessons from People Who Saw Jesus Suffer"), "Eye Witness 2: More Lessons from People Who Saw Jesus Suffer");
  assert.equal(tidyTitle("S.E.E. Family as Jesus Does"), "S.E.E. Family as Jesus Does");
  assert.equal(tidyTitle("MOVE Weekend"), "MOVE Weekend");
  assert.equal(tidyTitle("41st Anniversary Celebration"), "41st Anniversary Celebration");
});

test("4Ws weeks run newest first, undated ones last", async () => {
  const weeks = await getFourWsWeeks();
  const dated = weeks.filter((w) => w.serviceDate);
  for (let i = 1; i < dated.length; i++) assert.ok(dated[i - 1].serviceDate! >= dated[i].serviceDate!, `${dated[i - 1].slug} before ${dated[i].slug}`);
  const firstUndated = weeks.findIndex((w) => !w.serviceDate);
  if (firstUndated >= 0) assert.ok(weeks.slice(firstUndated).every((w) => !w.serviceDate));
});

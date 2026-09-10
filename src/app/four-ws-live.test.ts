import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("homepage 4Ws rail is driven by the synced guide, not a hardcoded blurb", () => {
  const src = read("src/app/page.tsx");
  assert.match(src, /getCurrentFourWsGuide/);
  // The generic FOUR_WS array survives only as the no-guide fallback.
  assert.match(src, /fourWs\?\.guide/);
  assert.match(src, /weekNumber|dateSpan/);
});

test("homepage 4Ws button points at the synced guide, not a message anchor", () => {
  const src = read("src/app/page.tsx");
  // The synced PDF when the guide has one, the guide route otherwise.
  assert.match(src, /fourWs\?\.guide\?\.downloadUrl/);
  assert.match(src, /\/watch\/4ws\/\$\{fourWs\.week\.slug\}/);
  assert.doesNotMatch(src, /messages\/\$\{latest\.slug\}#four-ws/);
});

test("the /watch/4ws/[slug] guide route exists and reads the synced guide", () => {
  const src = read("src/app/watch/4ws/[slug]/page.tsx");
  assert.match(src, /getFourWsGuide/);
  assert.match(src, /Weekly Prayer Points/);
  assert.match(src, /Memory verse/);
  assert.match(src, /generateStaticParams/);
});

test("the 4Ws index shows the current week with its number and date span", () => {
  const src = read("src/app/watch/4ws/page.tsx");
  assert.match(src, /getCurrentFourWs/);
  assert.match(src, /weekNumber/);
  assert.match(src, /dateSpan/);
});

test("message detail links to the synced 4Ws guide instead of a fake PDF button", () => {
  const src = read("src/app/watch/messages/[slug]/page.tsx");
  assert.match(src, /getFourWsWeeks/);
  assert.match(src, /fourWsHref/);
  assert.doesNotMatch(src, /Download PDF/);
});

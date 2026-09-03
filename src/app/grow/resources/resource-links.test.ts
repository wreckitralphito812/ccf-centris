import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("Resources renders real anchors for downloads, not inert buttons", () => {
  const src = read("src/app/grow/resources/page.tsx");
  assert.match(src, /href=\{r\.url\}/);
  assert.doesNotMatch(src, /<button[\s\S]{0,80}?>\s*Download/);
});

test("Chronicle links each issue to its official download and shows a date", () => {
  const src = read("src/app/grow/resources/chronicle/page.tsx");
  assert.match(src, /href=\{issue\.downloadUrl\}/);
  assert.match(src, /issue\.serviceDate/);
});

test("Scripture Memory shows week + date and links the card download", () => {
  const src = read("src/app/grow/resources/scripture-memory/page.tsx");
  assert.match(src, /Week \{(w|current)\.week\}/);
  assert.match(src, /href=\{(w|current)\.downloadUrl\}/);
});

test("Intercede links out to the source and never fabricates a form", () => {
  const src = read("src/app/intercede/page.tsx");
  assert.match(src, /campaign\.source\.sourceUrl/);
  assert.doesNotMatch(src, /<form[\s>]/);
});

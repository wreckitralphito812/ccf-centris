import assert from "node:assert/strict";
import test from "node:test";

import { badgeVariants, PILL_TONES } from "./badge";

test("every pill tone produces a non-empty class string", () => {
  for (const tone of PILL_TONES) {
    const cls = badgeVariants({ variant: tone });
    assert.ok(cls.length > 0, `tone ${tone} yielded empty class`);
  }
});

test("clay tone keeps the tinted fill and deep text", () => {
  const cls = badgeVariants({ variant: "clay" });
  assert.match(cls, /bg-clay-wash/);
  assert.match(cls, /text-clay-deep/);
});

test("live tone is the solid clay chip", () => {
  assert.match(badgeVariants({ variant: "live" }), /bg-clay\b/);
});

test("base is the calm sentence-case tag: no tracked label, no border", () => {
  const cls = badgeVariants({});
  assert.doesNotMatch(cls, /\blabel\b/);
  assert.doesNotMatch(cls, /\bborder\b/);
  assert.match(cls, /rounded-full px-3 py-1/);
});

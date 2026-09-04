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
  assert.match(cls, /bg-clay\/10/);
  assert.match(cls, /text-clay-deep/);
});

test("live tone is the solid clay chip", () => {
  assert.match(badgeVariants({ variant: "live" }), /bg-clay\b/);
});

test("base always includes the label utility and border box", () => {
  const cls = badgeVariants({});
  assert.match(cls, /\blabel\b/);
  assert.match(cls, /border px-2\.5 py-1/);
});

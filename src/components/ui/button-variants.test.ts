import assert from "node:assert/strict";
import test from "node:test";

import { buttonVariants, TONES } from "./button";

test("every tone produces a non-empty class string", () => {
  for (const tone of TONES) {
    const cls = buttonVariants({ variant: tone });
    assert.equal(typeof cls, "string");
    assert.ok(cls.length > 0, `tone ${tone} yielded empty class`);
  }
});

test("the primary tone carries the clay background", () => {
  assert.match(buttonVariants({ variant: "primary" }), /bg-clay\b/);
});

test("outline-on-dark keeps the cream border and text", () => {
  const cls = buttonVariants({ variant: "outline-on-dark" });
  assert.match(cls, /border-paper-bright/);
  assert.match(cls, /text-paper-bright/);
});

test("size lg carries the responsive padding step", () => {
  assert.match(buttonVariants({ size: "lg" }), /sm:px-7/);
});

test("full adds w-full", () => {
  assert.match(buttonVariants({ full: true }), /w-full/);
});

test("base always includes btn-press", () => {
  assert.match(buttonVariants({}), /btn-press/);
});

test("base pins the full type + reset string", () => {
  assert.match(
    buttonVariants({}),
    /uppercase tracking-\[0\.1em\] transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none/,
  );
});

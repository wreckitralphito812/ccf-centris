import assert from "node:assert/strict";
import test from "node:test";

import { referenceFor } from "./reference";

const UUID = "9f3a1c2e-4b5d-6789-a0b1-c2d3e4f5a6b7";

test("referenceFor is deterministic for the same id", () => {
  assert.equal(referenceFor("reservation", UUID), referenceFor("reservation", UUID));
});

test("referenceFor prefixes by kind and uses six upper-hex digits", () => {
  assert.equal(referenceFor("reservation", UUID), "CTR-9F3A1C");
  assert.equal(referenceFor("dgroup", UUID), "DG-9F3A1C");
  assert.equal(referenceFor("volunteer", UUID), "VOL-9F3A1C");
});

test("referenceFor pads when the id has fewer than six hex digits", () => {
  assert.equal(referenceFor("dgroup", "ab-"), "DG-AB0000");
});

test("different ids give different codes", () => {
  assert.notEqual(
    referenceFor("reservation", UUID),
    referenceFor("reservation", "00000000-1111-2222-3333-444444444444"),
  );
});

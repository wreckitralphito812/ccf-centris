import assert from "node:assert/strict";
import test from "node:test";

import { cleanName, isDisposableEmail, nameProblem, splitName } from "./member";

test("accepts real names in any script, with hyphens and apostrophes", () => {
  for (const n of ["Ana", "María José", "Dela Cruz", "O'Brien", "Jean-Luc", "Ma. Theresa", "Ñino", "李"]) {
    assert.equal(nameProblem(cleanName(n), "first name"), null, n);
  }
});

test("rejects empty, too long, or non-name input", () => {
  assert.ok(nameProblem("", "surname"));
  assert.ok(nameProblem("x".repeat(61), "surname"));
  assert.ok(nameProblem("Ana123", "first name"));
  assert.ok(nameProblem("-Ana", "first name"));
  assert.ok(nameProblem("ana@example.com", "first name"));
});

test("tidies spacing", () => {
  assert.equal(cleanName("  Ana   Cruz "), "Ana Cruz");
});

test("splits a full name for the member to confirm", () => {
  assert.deepEqual(splitName("Maria Clara Santos"), { first: "Maria Clara", last: "Santos" });
  assert.deepEqual(splitName("Ana"), { first: "Ana", last: "" });
  assert.deepEqual(splitName(null), { first: "", last: "" });
});

test("refuses throwaway inboxes, allows ordinary ones", () => {
  assert.equal(isDisposableEmail("someone@Mailinator.com"), true);
  assert.equal(isDisposableEmail("someone@gmail.com"), false);
  assert.equal(isDisposableEmail("someone@ccf.org.ph"), false);
});

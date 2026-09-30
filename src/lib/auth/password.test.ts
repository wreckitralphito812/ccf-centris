import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage, passwordProblem } from "./password";

test("passwords need 8 characters and a letter and a number", () => {
  assert.equal(passwordProblem(""), "Enter a password.");
  assert.equal(passwordProblem("abc12"), "Use at least 8 characters.");
  assert.equal(passwordProblem("abcdefgh"), "Include at least one number.");
  assert.equal(passwordProblem("12345678"), "Include at least one letter.");
  assert.equal(passwordProblem("grace2026"), null);
});

test("Firebase errors read in plain words", () => {
  assert.match(authErrorMessage("auth/invalid-credential"), /email or password/i);
  assert.match(authErrorMessage("auth/wrong-password"), /email or password/i);
  assert.match(authErrorMessage("auth/user-not-found"), /email or password/i);
  assert.match(authErrorMessage("auth/email-already-in-use"), /already has an account/i);
  assert.match(authErrorMessage("auth/too-many-requests"), /too many tries/i);
  assert.match(authErrorMessage("auth/weak-password"), /stronger/i);
  assert.match(authErrorMessage("auth/network-request-failed"), /connection/i);
  assert.match(authErrorMessage("something/else"), /try again/i);
});

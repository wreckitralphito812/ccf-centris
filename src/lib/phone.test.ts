import assert from "node:assert/strict";
import test from "node:test";
import { formatPhMobile, normalizePhMobile, phMobileProblem } from "./phone";

test("formats as you type: 0917 123 4567", () => {
  assert.equal(formatPhMobile("0"), "0");
  assert.equal(formatPhMobile("0917"), "0917");
  assert.equal(formatPhMobile("09171"), "0917 1");
  assert.equal(formatPhMobile("0917123"), "0917 123");
  assert.equal(formatPhMobile("09171234567"), "0917 123 4567");
  assert.equal(formatPhMobile("0917-123-4567"), "0917 123 4567");
  assert.equal(formatPhMobile("091712345678"), "0917 123 4567");
});

test("+63 and leading 9 become 09", () => {
  assert.equal(formatPhMobile("+63 917 123 4567"), "0917 123 4567");
  assert.equal(formatPhMobile("639171234567"), "0917 123 4567");
  assert.equal(formatPhMobile("9171234567"), "0917 123 4567");
});

test("only complete PH mobile numbers pass", () => {
  assert.equal(phMobileProblem("0917 123 4567"), null);
  assert.equal(phMobileProblem("+63 917 123 4567"), null);
  assert.match(phMobileProblem("")!, /mobile number/);
  assert.match(phMobileProblem("0917 123")!, /0917 123 4567/);
  assert.match(phMobileProblem("0287 123 4567")!, /0917 123 4567/);
  assert.equal(normalizePhMobile("+639171234567"), "0917 123 4567");
  assert.equal(normalizePhMobile("12345"), null);
});

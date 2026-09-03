import assert from "node:assert/strict";
import test from "node:test";

import { classifySourceUrl } from "./source-policy";

test("allows an approved public page", () => {
  assert.deepEqual(
    classifySourceUrl(new URL("https://www.ccf.org.ph/chronicle/")),
    { allowed: true, reason: "approved_public_source" },
  );
});

test("allows the apex host and the 52-week scripture page", () => {
  assert.equal(
    classifySourceUrl(new URL("https://ccf.org.ph/52-week-scripture/")).allowed,
    true,
  );
});

test("allows the published GLC library and class pages", () => {
  assert.equal(
    classifySourceUrl(new URL("https://glc.ccf.org.ph/glc-library/")).allowed,
    true,
  );
  assert.equal(
    classifySourceUrl(new URL("https://glc.ccf.org.ph/course/biblical-foundations/")).allowed,
    true,
  );
});

test("rejects GLC account, cart, and checkout routes", () => {
  for (const href of [
    "https://glc.ccf.org.ph/my-account/",
    "https://glc.ccf.org.ph/cart/",
    "https://glc.ccf.org.ph/checkout/",
    "https://glc.ccf.org.ph/wp-json/wp/v2/pages",
  ]) {
    assert.equal(classifySourceUrl(new URL(href)).allowed, false, href);
  }
});

test("rejects REST, protected, staging, and foreign fetch targets", () => {
  for (const href of [
    "https://www.ccf.org.ph/wp-json/wp/v2/pages",
    "https://www.ccf.org.ph/?rest_route=/wp/v2/posts",
    "https://www.ccf.org.ph/dleaders-corner/login/",
    "https://www.ccf.org.ph/new-give-submit-sandbox/",
    "https://www.ccf.org.ph/give-success/",
    "https://evil.example/chronicle/",
  ]) {
    assert.equal(classifySourceUrl(new URL(href)).allowed, false, href);
  }
});

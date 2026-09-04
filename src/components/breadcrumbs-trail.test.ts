import assert from "node:assert/strict";
import test from "node:test";

import { breadcrumbJsonLd, withHome } from "./breadcrumbs-trail";
import { SITE } from "../lib/site";

test("withHome prepends a Home crumb linking to /", () => {
  const trail = withHome([
    { label: "Watch", href: "/watch" },
    { label: "A message" },
  ]);
  assert.equal(trail.length, 3);
  assert.deepEqual(trail[0], { label: "Home", href: "/" });
  assert.equal(trail[2].label, "A message");
  assert.equal(trail[2].href, undefined);
});

test("JSON-LD has one ListItem per crumb, positioned from 1", () => {
  const ld = breadcrumbJsonLd(
    withHome([{ label: "Events", href: "/events" }, { label: "Retreat" }]),
  );
  assert.equal(ld["@type"], "BreadcrumbList");
  assert.equal(ld.itemListElement.length, 3);
  assert.deepEqual(
    ld.itemListElement.map((e) => e.position),
    [1, 2, 3],
  );
});

test("JSON-LD gives linked crumbs an absolute item URL, the last none", () => {
  const ld = breadcrumbJsonLd(
    withHome([
      { label: "Serve", href: "/serve" },
      { label: "Greeter" }, // current page, no href
    ]),
  );
  const [home, serve, current] = ld.itemListElement;
  assert.equal(home.item, new URL("/", SITE.url).toString());
  assert.equal(serve.item, `${SITE.url}/serve`);
  assert.equal("item" in current, false);
});

test("a crumb with an href in the last position still gets no item URL", () => {
  const ld = breadcrumbJsonLd([
    { label: "Home", href: "/" },
    { label: "Oops", href: "/oops" },
  ]);
  assert.equal("item" in ld.itemListElement[1], false);
});

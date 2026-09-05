import assert from "node:assert/strict";
import test from "node:test";

import { parseDuration } from "./youtube-api";
import { serviceDateFromTitle } from "./services";

/**
 * These modules are `server-only`, so this file is run with the `react-server`
 * export condition (see the `test:content` script), which resolves that marker
 * package to an empty module.
 */

/* --- parseDuration -------------------------------------------------------- */

test("parseDuration reads hours, minutes and seconds", () => {
  assert.equal(parseDuration("PT1H12M30S"), 4350);
  assert.equal(parseDuration("PT45M"), 2700);
  assert.equal(parseDuration("PT30S"), 30);
  assert.equal(parseDuration("PT2H"), 7200);
  assert.equal(parseDuration("PT0S"), 0);
});

test("parseDuration counts the day component", () => {
  // YouTube emits P#DT… past 24 hours; a PT-only pattern scores these as 0.
  assert.equal(parseDuration("P1DT2H"), 93_600);
  assert.equal(parseDuration("P1D"), 86_400);
});

test("parseDuration floors fractional seconds", () => {
  assert.equal(parseDuration("PT1H2M3.5S"), 3723);
});

test("parseDuration returns 0 for anything that is not a duration", () => {
  for (const bad of ["", "garbage", "P3W", "xPT1HxS"]) {
    assert.equal(parseDuration(bad), 0, `expected 0 for ${JSON.stringify(bad)}`);
  }
});

/* --- serviceDateFromTitle ------------------------------------------------- */

const title = (d: string) => `Worship with us live! | Sunday Service (${d})`;

test("serviceDateFromTitle reads the service date at 09:00 Manila", () => {
  const d = serviceDateFromTitle(title("September 13, 2026"));
  assert.ok(d);
  // 09:00 +08:00 is 01:00 UTC the same day.
  assert.equal(d.toISOString(), "2026-09-13T01:00:00.000Z");
});

test("serviceDateFromTitle rejects a day that does not exist in the month", () => {
  // Without a rollover guard this silently became March 3.
  assert.equal(serviceDateFromTitle(title("February 31, 2026")), null);
});

test("serviceDateFromTitle never returns an Invalid Date", () => {
  // An Invalid Date satisfies `instanceof Date` and then throws from
  // .toISOString() downstream, so it must be filtered out here.
  const d = serviceDateFromTitle(title("September 32, 2026"));
  assert.equal(d, null);
});

test("serviceDateFromTitle returns null when there is no parseable date", () => {
  assert.equal(serviceDateFromTitle("no date here"), null);
  assert.equal(serviceDateFromTitle(title("Septober 13, 2026")), null);
});

test("serviceDateFromTitle accepts a leap day in a leap year", () => {
  const d = serviceDateFromTitle(title("February 29, 2028"));
  assert.ok(d);
  assert.equal(d.toISOString(), "2028-02-29T01:00:00.000Z");
  // ...and rejects it in a non-leap year.
  assert.equal(serviceDateFromTitle(title("February 29, 2027")), null);
});

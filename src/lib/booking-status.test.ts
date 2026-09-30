import assert from "node:assert/strict";
import test from "node:test";
import { statusBadge, whenLabel } from "./booking-status";

test("statuses read in plain words with CCF tones", () => {
  assert.deepEqual(statusBadge("approved"), { label: "Confirmed", tone: "ok" });
  assert.deepEqual(statusBadge("confirmed"), { label: "Confirmed", tone: "ok" });
  assert.deepEqual(statusBadge("pending"), { label: "Awaiting approval", tone: "wait" });
  assert.deepEqual(statusBadge("rejected"), { label: "Declined", tone: "grey" });
  assert.deepEqual(statusBadge("cancelled"), { label: "Cancelled", tone: "grey" });
  assert.deepEqual(statusBadge("weird"), { label: "weird", tone: "grey" });
});

test("when a booking is, counted in Manila days", () => {
  assert.equal(whenLabel("2026-10-07", "2026-10-07"), "Today");
  assert.equal(whenLabel("2026-10-08", "2026-10-07"), "Tomorrow");
  assert.equal(whenLabel("2026-10-10", "2026-10-07"), "In 3 days");
  assert.equal(whenLabel("2026-10-13", "2026-10-07"), "In 6 days");
  assert.equal(whenLabel("2026-10-14", "2026-10-07"), "Wed, Oct 14");
});

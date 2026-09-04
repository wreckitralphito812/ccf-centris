import assert from "node:assert/strict";
import test from "node:test";

import {
  parseReservation,
  parseDgroupInquiry,
  parseVolunteerApplication,
} from "./validation";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const FUTURE_DATE = "2099-06-01";

test("parseReservation accepts a well-formed court booking", () => {
  const r = parseReservation(
    fd({
      facility_slug: "sports-hall",
      court_id: "court-1",
      date: FUTURE_DATE,
      start_time: "18:00",
      hours: "2",
      participants: "8",
      name: "Sam Cruz",
      email: "sam@example.com",
      accept: "true",
    }),
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.court_id, "court-1");
    assert.equal(r.value.participants, 8);
    // 18:00 +08:00 for two hours.
    assert.equal(r.value.starts_at, new Date(`${FUTURE_DATE}T18:00:00+08:00`).toISOString());
    assert.equal(
      r.value.ends_at,
      new Date(`${FUTURE_DATE}T20:00:00+08:00`).toISOString(),
    );
  }
});

test("parseReservation reports each missing field by name", () => {
  const r = parseReservation(fd({ hours: "1" }));
  assert.equal(r.ok, false);
  if (!r.ok) {
    for (const key of ["facility_slug", "date", "start_time", "name", "email", "accept"]) {
      assert.ok(r.fieldErrors[key], `expected an error for ${key}`);
    }
  }
});

test("parseReservation rejects an unchecked rules box", () => {
  const r = parseReservation(
    fd({
      facility_slug: "hall",
      date: FUTURE_DATE,
      start_time: "10:00",
      hours: "1",
      participants: "2",
      name: "A",
      email: "a@b.co",
    }),
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.fieldErrors.accept);
});

test("parseReservation rejects a start time in the past", () => {
  const r = parseReservation(
    fd({
      facility_slug: "hall",
      date: "2000-01-01",
      start_time: "10:00",
      hours: "1",
      participants: "2",
      name: "A",
      email: "a@b.co",
      accept: "true",
    }),
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.fieldErrors.start_time);
});

test("parseDgroupInquiry needs a name and a valid email", () => {
  assert.equal(parseDgroupInquiry(fd({ name: "Jo" })).ok, false);
  assert.equal(parseDgroupInquiry(fd({ name: "Jo", email: "nope" })).ok, false);

  const ok = parseDgroupInquiry(
    fd({ name: "Jo", email: "jo@example.com", age: "25–34", dgroup_id: "d1" }),
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.dgroup_id, "d1");
    assert.equal(ok.value.age_bracket, "25–34");
  }
});

test("parseVolunteerApplication requires a role_id and folds availability into the message", () => {
  const missing = parseVolunteerApplication(
    fd({ name: "Kai", email: "kai@example.com" }),
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.ok(missing.fieldErrors.role_id);

  const ok = parseVolunteerApplication(
    fd({
      name: "Kai",
      email: "kai@example.com",
      role_id: "r1",
      availability: "Weekday evenings",
      message: "Happy to help.",
    }),
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.match(ok.value.message ?? "", /Weekday evenings/);
    assert.match(ok.value.message ?? "", /Happy to help\./);
  }
});

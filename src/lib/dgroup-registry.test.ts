import assert from "node:assert/strict";
import test from "node:test";

import { parseDgroup, scheduleText } from "./dgroup-registry";

function form(over: Record<string, string> = {}) {
  const base: Record<string, string> = {
    name: "Ralph's men's Dgroup",
    audience: "men",
    day: "3",
    start_time: "19:00",
    frequency: "weekly",
    meets_where: "centris",
    general_area: "",
    current_size: "6",
    is_open: "1",
    leader_name: "Ralph Relucio",
    leader_mobile: "0917 123 4567",
    co_leader_name: "",
    description: "",
    ...over,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) fd.append(k, v);
  return fd;
}

test("a complete registration parses", () => {
  const r = parseDgroup(form());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.dayOfWeek, 3);
  assert.equal(r.value.startTime, "19:00");
  assert.equal(r.value.isOpen, true);
  assert.equal(r.value.generalArea, null);
  assert.equal(r.value.coLeaderName, null);
});

test("missing or wrong answers come back as plain messages", () => {
  const r = parseDgroup(form({ name: "", audience: "aliens", day: "", start_time: "7pm", meets_where: "", current_size: "0", leader_name: "", leader_mobile: "call me" }));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.deepEqual(Object.keys(r.errors).sort(), ["audience", "day", "leader", "mobile", "name", "size", "time", "where"]);
});

test("groups that meet elsewhere name a general area; others don't keep one", () => {
  const missing = parseDgroup(form({ meets_where: "elsewhere" }));
  assert.equal(missing.ok, false);
  const ok = parseDgroup(form({ meets_where: "elsewhere", general_area: "Katipunan" }));
  assert.ok(ok.ok && ok.value.generalArea === "Katipunan");
  const centris = parseDgroup(form({ general_area: "Katipunan" }));
  assert.ok(centris.ok && centris.value.generalArea === null);
});

test("closed to new members unless ticked; Sunday is a real day", () => {
  const r = parseDgroup(form({ is_open: "0", day: "0", start_time: "9:30" }));
  assert.ok(r.ok && r.value.isOpen === false && r.value.dayOfWeek === 0 && r.value.startTime === "09:30");
});

test("the schedule reads the way people say it", () => {
  assert.equal(scheduleText({ day_of_week: 3, start_time: "19:00:00", frequency: "weekly" }), "Wednesdays, 7:00 PM");
  assert.equal(scheduleText({ day_of_week: 0, start_time: "09:30", frequency: "every_other_week" }), "Sundays, 9:30 AM, every other week");
  assert.equal(scheduleText({ day_of_week: 5, start_time: "12:15", frequency: "monthly" }), "Fridays, 12:15 PM, once a month");
});

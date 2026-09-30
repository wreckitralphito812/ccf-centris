import assert from "node:assert/strict";
import test from "node:test";
import { bookingEmail } from "./dgroup-booking";
import { roomRequestEmail } from "./room-request";

test("the Dgroup reminder says tomorrow and carries the invite", () => {
  const m = bookingEmail({ kind: "reminder", origin: "https://x", leaderName: "Ana Cruz", roomSlug: "welcome-center", labels: ["4"], date: "2026-10-07", slotId: "1600", groupSize: 6 });
  assert.match(m.subject, /^Tomorrow: /);
  assert.match(m.html, /See you tomorrow, Ana/);
  assert.equal(m.attachments?.[0].filename, "dgroup-table.ics");
});

test("the room reminder says tomorrow and carries the invite", () => {
  const m = roomRequestEmail({ kind: "reminder", origin: "https://x", reference: "R-1", requester: "Ana Cruz", requesterEmail: "a@x", mobile: null, activity: "Huddle", ministry: "Elevate", rooms: ["John (MPH 1)"], when: "Tue", participants: 60, setup: "classroom", equipment: null, food: "none", notes: null, span: { startsAt: "2026-10-06T05:00:00.000Z", endsAt: "2026-10-06T09:00:00.000Z" } });
  assert.match(m.subject, /^Tomorrow: /);
  assert.match(m.html, /See you tomorrow, Ana/);
  assert.equal(m.attachments?.[0].filename, "room-booking.ics");
});

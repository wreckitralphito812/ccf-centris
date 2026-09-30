/**
 * "Add to calendar" for bookings: a Google Calendar link, and an .ics file
 * that Apple Calendar and Outlook open. From the design review, 2026-09-30:
 * a booking in the calendar is one people don't forget.
 *
 * Plain functions with no secrets, so the confirmation screens (browser) and
 * the emails (server) build the same event.
 */
import { SITE } from "@/lib/site";
import { DGROUP_SLOTS, roomName as dgroupRoomName, slotLabel, tablesLabel } from "@/lib/dgroup-tables";

export interface CalendarEvent {
  /** Stable per booking, so adding it twice updates rather than duplicates. */
  uid: string;
  title: string;
  /** Manila "YYYY-MM-DD" and "HH:MM". */
  date: string;
  start: string;
  end: string;
  details: string;
  location?: string;
}

const LOCATION = `${SITE.name}, ${SITE.addressLines.join(", ")}`;

/** "2026-10-06" + "13:00" in Manila → "20261006T050000Z". */
export function utcStamp(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00+08:00`).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** A UTC ISO time as Manila "YYYY-MM-DD" and "HH:MM" (Manila has no daylight saving). */
export function manilaParts(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + 8 * 3_600_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

export function googleCalendarLink(ev: CalendarEvent): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${utcStamp(ev.date, ev.start)}/${utcStamp(ev.date, ev.end)}`,
    details: ev.details,
    location: ev.location ?? LOCATION,
    ctz: "Asia/Manila",
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Text values in an .ics file escape \ ; , and newlines (RFC 5545 §3.3.11). */
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets fold onto the next line with a leading space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function icsFile(ev: CalendarEvent, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CCF Centris//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@ccf-centris`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${utcStamp(ev.date, ev.start)}`,
    `DTEND:${utcStamp(ev.date, ev.end)}`,
    `SUMMARY:${icsText(ev.title)}`,
    `DESCRIPTION:${icsText(ev.details)}`,
    `LOCATION:${icsText(ev.location ?? LOCATION)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
    .concat("\r\n");
}

/**
 * A link that downloads the .ics straight from the page, no server trip. The
 * DTSTAMP is fixed to the event's day rather than "now", so the server and the
 * browser render the same link (a "now" stamp broke hydration, 2026-09-30).
 */
export function icsHref(ev: CalendarEvent): string {
  const stamp = new Date(`${ev.date}T00:00:00+08:00`);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFile(ev, stamp))}`;
}

/** A Dgroup table booking as a calendar event. */
export function dgroupEvent(b: { date: string; slotId: string; roomSlug: string; labels: string[] }): CalendarEvent {
  const slot = DGROUP_SLOTS.find((s) => s.id === b.slotId);
  const tables = tablesLabel(b.labels);
  const room = dgroupRoomName(b.roomSlug);
  return {
    uid: `dgroup-${b.date}-${b.slotId}-${b.roomSlug}-${b.labels.join("-")}`,
    title: `Dgroup · ${tables}, ${room}`,
    date: b.date,
    start: slot?.start ?? "13:00",
    end: slot?.end ?? "15:30",
    details: `${tables} in the ${room} at ${SITE.name}, ${slotLabel(b.slotId)}. Change or cancel at ${SITE.url}/reserve/dgroup`,
  };
}

/** A ministry room request as a calendar event. */
export function roomEvent(r: {
  reference: string;
  activity: string;
  rooms: string[];
  date: string;
  start: string;
  end: string;
  confirmed: boolean;
}): CalendarEvent {
  return {
    uid: `room-${r.reference}`,
    title: r.confirmed ? r.activity : `${r.activity} (room requested)`,
    date: r.date,
    start: r.start,
    end: r.end,
    details: `${r.rooms.join(", ")} at ${SITE.name}. Reference ${r.reference}.${
      r.confirmed ? "" : " Waiting for the facilities team to confirm."
    }`,
  };
}

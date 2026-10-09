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
  /**
   * An all-day date (2026-10-10): `start`/`end` are ignored and calendars get
   * whole days, through `endDate` (inclusive) for one running several days.
   */
  allDay?: boolean;
  /** Manila "YYYY-MM-DD", the last day of an all-day event over several days. */
  endDate?: string;
}

/** "2026-10-18" → "20261019": all-day ends are exclusive in both formats. */
const dayAfter = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
const compact = (date: string) => date.replace(/-/g, "");

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
    dates: ev.allDay
      ? `${compact(ev.date)}/${dayAfter(ev.endDate ?? ev.date)}`
      : `${utcStamp(ev.date, ev.start)}/${utcStamp(ev.endDate ?? ev.date, ev.end)}`,
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
    ...(ev.allDay
      ? [`DTSTART;VALUE=DATE:${compact(ev.date)}`, `DTEND;VALUE=DATE:${dayAfter(ev.endDate ?? ev.date)}`]
      : [`DTSTART:${utcStamp(ev.date, ev.start)}`, `DTEND:${utcStamp(ev.endDate ?? ev.date, ev.end)}`]),
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
 * The .ics as a link to /api/calendar, which serves it as a real file
 * (2026-10-10). It used to be a data: link built in the page, which iPhone
 * Safari won't open, so "Apple or Outlook" did nothing there. The event
 * travels in the link (no personal details: title, times, place, page link)
 * and the result is the same on the server and in the browser.
 */
export function icsHref(ev: CalendarEvent): string {
  const json = JSON.stringify(ev);
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(json, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return `/api/calendar?e=${b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

/** The event back out of an icsHref link, or null if it isn't one we'd make. */
export function eventFromIcsParam(param: string | null): CalendarEvent | null {
  if (!param || param.length > 4000) return null;
  try {
    const json = Buffer.from(param.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const v = JSON.parse(json) as Partial<CalendarEvent>;
    const str = (x: unknown, max: number) => typeof x === "string" && x.length <= max;
    const day = (x: unknown) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
    const hhmm = (x: unknown) => typeof x === "string" && /^\d{2}:\d{2}$/.test(x);
    if (!str(v.uid, 200) || !str(v.title, 200) || !day(v.date) || !hhmm(v.start) || !hhmm(v.end) || !str(v.details, 1500)) return null;
    if (v.location !== undefined && !str(v.location, 300)) return null;
    if (v.endDate !== undefined && !day(v.endDate)) return null;
    return {
      uid: v.uid!,
      title: v.title!,
      date: v.date!,
      start: v.start!,
      end: v.end!,
      details: v.details!,
      ...(v.location !== undefined ? { location: v.location } : {}),
      ...(v.allDay ? { allDay: true } : {}),
      ...(v.endDate ? { endDate: v.endDate } : {}),
    };
  } catch {
    return null;
  }
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

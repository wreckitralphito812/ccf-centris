/**
 * Field validation for the write-path forms.
 *
 * Hand-rolled to match the existing `validate()` style in the client forms —
 * no schema dependency. Each function takes a `FormData` and returns
 * `{ ok: true, value }` or `{ ok: false, fieldErrors }`, where `fieldErrors`
 * keys line up with the `name` attributes the forms already use.
 */

import {
  EQUIPMENT,
  FOOD,
  MINISTRIES,
  SETUPS,
  STEP_MINUTES,
  closedReason,
  ministryRoom,
  toMinutes,
  weekdayOf,
  type Setup,
} from "@/lib/ministry-rooms";

export type FieldErrors = Record<string, string>;

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: FieldErrors };

const EMAIL = /.+@.+\..+/;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function optional(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

// --- Reservation ----------------------------------------------------------

export interface ReservationInput {
  facility_slug: string;
  court_id: string | null;
  starts_at: string; // ISO
  ends_at: string; // ISO
  participants: number;
  layout: string | null;
  activity_name: string | null;
  organization: string | null;
  purpose: string | null;
  contact_name: string;
  contact_email: string;
  contact_mobile: string | null;
  accepted: boolean;
}

/** `YYYY-MM-DD` + `HH:MM` in Manila (+08:00) to a UTC ISO string. */
export function manilaIso(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00+08:00`).toISOString();
}

export function parseReservation(fd: FormData): Parsed<ReservationInput> {
  const fieldErrors: FieldErrors = {};

  const facility_slug = str(fd, "facility_slug");
  const court_id = optional(fd, "court_id");
  const dateKey = str(fd, "date");
  const startTime = str(fd, "start_time");
  const hoursRaw = str(fd, "hours");
  const participantsRaw = str(fd, "participants");
  const contact_name = str(fd, "name");
  const contact_email = str(fd, "email");
  const accepted = fd.get("accept") === "on" || fd.get("accept") === "true";

  if (!facility_slug) fieldErrors.facility_slug = "Choose a space.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) fieldErrors.date = "Choose a date.";
  if (!/^\d{2}:\d{2}$/.test(startTime))
    fieldErrors.start_time = "Choose a start time.";

  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours < 1 || hours > 8)
    fieldErrors.hours = "Choose how long.";

  const participants = Number(participantsRaw);
  if (!Number.isInteger(participants) || participants < 1)
    fieldErrors.participants = "Enter how many people.";

  if (!contact_name) fieldErrors.name = "Tell us your name.";
  if (!contact_email) fieldErrors.email = "We need an email to reach you.";
  else if (!EMAIL.test(contact_email))
    fieldErrors.email = "That does not look like an email address.";

  if (!accepted) fieldErrors.accept = "Please read and accept the policies first.";

  let starts_at = "";
  let ends_at = "";
  if (!fieldErrors.date && !fieldErrors.start_time && !fieldErrors.hours) {
    starts_at = manilaIso(dateKey, startTime);
    ends_at = new Date(
      new Date(starts_at).getTime() + hours * 3600_000,
    ).toISOString();
    if (new Date(starts_at).getTime() < Date.now() - 60_000)
      fieldErrors.start_time = "That time is in the past.";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      facility_slug,
      court_id,
      starts_at,
      ends_at,
      participants,
      layout: optional(fd, "layout"),
      activity_name: optional(fd, "activity"),
      organization: optional(fd, "org"),
      purpose: optional(fd, "purpose"),
      contact_name,
      contact_email,
      contact_mobile: optional(fd, "mobile"),
      accepted,
    },
  };
}

// --- Ministry room request ----------------------------------------------

export interface RoomRequestInput {
  rooms: string[];
  date: string;
  start: string; // "HH:MM", Manila
  end: string;
  starts_at: string; // ISO
  ends_at: string;
  activity_name: string;
  ministry: string;
  participants: number;
  setup: Setup;
  equipment: Record<string, number>;
  food: string;
  notes: string | null;
  contact_name: string;
  contact_mobile: string;
}

/**
 * A room request from /centris/reserve. Checks every rule the form shows, so a
 * hand-built request can't book a closed room or a Sunday: the rooms are real
 * ministry rooms, each open for the whole time asked for, on the half hour, and
 * not in the past.
 */
export function parseRoomRequest(fd: FormData, now = Date.now()): Parsed<RoomRequestInput> {
  const fieldErrors: FieldErrors = {};

  const activity_name = str(fd, "activity");
  const ministryPick = str(fd, "ministry");
  const ministry = ministryPick === "Other" ? str(fd, "ministry_other") : ministryPick;
  const participants = Number(str(fd, "participants"));
  const setup = str(fd, "setup") as Setup;
  const date = str(fd, "date");
  const start = str(fd, "start");
  const end = str(fd, "end");
  const rooms = [...new Set(fd.getAll("room").map(String))];
  const food = str(fd, "food");
  const contact_name = str(fd, "name");
  const contact_mobile = str(fd, "mobile");

  if (!activity_name) fieldErrors.activity = "Give your event a name.";
  if (!ministry || (ministryPick !== "Other" && !(MINISTRIES as readonly string[]).includes(ministry)))
    fieldErrors.ministry = ministryPick === "Other" ? "Type your ministry's name." : "Choose your ministry.";
  if (!Number.isInteger(participants) || participants < 1)
    fieldErrors.participants = "Enter how many people, including your team.";
  if (!SETUPS.some((s) => s.id === setup)) fieldErrors.setup = "Choose a set-up.";

  const times = /^\d{2}:\d{2}$/;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fieldErrors.date = "Choose a date.";
  else if (weekdayOf(date) === 0) fieldErrors.date = "Rooms can't be requested on Sundays.";
  if (!times.test(start) || !times.test(end)) fieldErrors.time = "Choose a start and end time.";

  let starts_at = "";
  let ends_at = "";
  if (!fieldErrors.date && !fieldErrors.time) {
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (s % STEP_MINUTES || e % STEP_MINUTES) fieldErrors.time = "Times go on the hour or half hour.";
    else if (e <= s) fieldErrors.time = "The end time must be after the start.";
    else {
      starts_at = manilaIso(date, start);
      ends_at = manilaIso(date, end);
      if (new Date(starts_at).getTime() < now - 60_000) fieldErrors.time = "That time has already passed.";
    }
  }

  if (!rooms.length) fieldErrors.rooms = "Choose at least one room.";
  else if (rooms.some((r) => !ministryRoom(r))) fieldErrors.rooms = "One of those rooms can't be requested here.";
  else if (!fieldErrors.date && !fieldErrors.time) {
    for (const r of rooms) {
      const why = closedReason(r, date, toMinutes(start), toMinutes(end));
      if (why) {
        fieldErrors.rooms = `${ministryRoom(r)!.name} isn't open then: ${why.toLowerCase()}`;
        break;
      }
    }
  }
  if (!fieldErrors.rooms && !fieldErrors.setup && rooms.some((r) => !ministryRoom(r)!.capacity[setup]))
    fieldErrors.rooms = "One of those rooms doesn't offer that set-up.";

  const equipment: Record<string, number> = {};
  for (const item of EQUIPMENT) {
    const n = Number(str(fd, `eq_${item.id}`) || 0);
    if (Number.isInteger(n) && n > 0) equipment[item.id] = Math.min(n, item.max);
  }

  if (!FOOD.some((f) => f.id === food)) fieldErrors.food = "Tell us about food.";
  if (!contact_name) fieldErrors.name = "Tell us your name.";
  if (contact_mobile.replace(/\D/g, "").length < 7) fieldErrors.mobile = "We need a mobile number for same-day changes.";
  if (fd.get("accept") !== "on") fieldErrors.accept = "Please read and accept the room policies first.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      rooms,
      date,
      start,
      end,
      starts_at,
      ends_at,
      activity_name,
      ministry,
      participants,
      setup,
      equipment,
      food,
      notes: optional(fd, "notes"),
      contact_name,
      contact_mobile,
    },
  };
}

// --- Inquiries ----------------------------------------------------------

export interface ContactInput {
  full_name: string;
  email: string;
  mobile: string | null;
  message: string | null;
}

function parseContact(fd: FormData): Parsed<ContactInput> {
  const fieldErrors: FieldErrors = {};
  const full_name = str(fd, "name");
  const email = str(fd, "email");

  if (!full_name) fieldErrors.name = "Tell us your name.";
  if (!email) fieldErrors.email = "We need an email to reply to.";
  else if (!EMAIL.test(email))
    fieldErrors.email = "That does not look like an email address.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      full_name,
      email,
      mobile: optional(fd, "mobile"),
      message: optional(fd, "message"),
    },
  };
}

export interface DgroupInquiryInput extends ContactInput {
  dgroup_id: string | null;
  age_bracket: string | null;
}

export function parseDgroupInquiry(fd: FormData): Parsed<DgroupInquiryInput> {
  const base = parseContact(fd);
  if (!base.ok) return base;
  return {
    ok: true,
    value: {
      ...base.value,
      dgroup_id: optional(fd, "dgroup_id"),
      age_bracket: optional(fd, "age"),
    },
  };
}

export interface VolunteerApplicationInput extends ContactInput {
  role_id: string;
}

export function parseVolunteerApplication(
  fd: FormData,
): Parsed<VolunteerApplicationInput> {
  const base = parseContact(fd);
  const role_id = str(fd, "role_id");
  if (!base.ok) {
    if (!role_id) base.fieldErrors.role_id = "Missing role.";
    return base;
  }
  if (!role_id) return { ok: false, fieldErrors: { role_id: "Missing role." } };

  // `availability` has no column of its own — keep it with the free-text note.
  const availability = str(fd, "availability");
  const message = [
    availability ? `Usually free: ${availability}` : null,
    base.value.message,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ok: true,
    value: { ...base.value, message: message || null, role_id },
  };
}

/**
 * Gym court rentals: the sports, prices, open hours, booking window and the
 * rules for checking a booking. From Adrian Camacho (facilities), 2026-10-20,
 * and his Sports Hall schedule (Sched.xlsx):
 *
 * - The Sports Ministry keeps the dark blocks on the schedule (Monday and
 *   Saturday sports fellowship, Wednesday and Friday evenings, Filchi on
 *   Saturday). The light blocks are for rent, each for one sport.
 * - Pickleball and badminton: 3 courts at once, ₱450 a court an hour.
 *   Volleyball and basketball: 1 court (the whole floor), ₱1,800 an hour.
 * - Leaders of a registered Dgroup book, like Dgroup tables.
 * - Whole hours, 1 to 3. From tomorrow to a week ahead.
 * - Confirmed once the renter uploads a screenshot of their payment to
 *   CCF Centris's QR code. Staff check it and cancel any that wasn't paid.
 * - No cancellations or refunds. A renter can move a rental to another open
 *   time for the same sport, up to a week ahead, even on the day itself.
 *
 * The page, the form, the server actions, the emails and the admin pages all
 * read from here, so changing a value here changes it everywhere.
 */
import { normalizePhMobile } from "@/lib/phone";

/**
 * The switch for new rentals (Adrian, 2026-10-20: "Coming Real Soon!!!" until
 * the team is ready). While false, the Reserve card shows the banner instead
 * of a button, /reserve/courts shows it instead of the form, and the server
 * refuses new bookings. Moving a rental already booked, and the admin pages,
 * keep working. Set to true to open rentals.
 */
export const COURTS_OPEN = false;
export const COURTS_SOON = "Coming Real Soon!!!";

export type Sport = "pickleball" | "badminton" | "volleyball" | "basketball";

export interface SportInfo {
  id: Sport;
  name: string;
  /** How many can be rented at the same time. */
  courts: number;
  /** Pesos per court per hour. */
  rate: number;
}

export const SPORTS: SportInfo[] = [
  { id: "pickleball", name: "Pickleball", courts: 3, rate: 450 },
  { id: "badminton", name: "Badminton", courts: 3, rate: 450 },
  { id: "volleyball", name: "Volleyball", courts: 1, rate: 1800 },
  { id: "basketball", name: "Basketball", courts: 1, rate: 1800 },
];

export const sportInfo = (id: string) => SPORTS.find((s) => s.id === id) ?? null;
export const sportName = (id: string) => sportInfo(id)?.name ?? id;

/** One stretch of rentable hours: from `from` to `to` (24-hour clock, whole hours). */
export interface RentalWindow {
  sport: Sport;
  from: number;
  to: number;
}

/**
 * The light blocks on Adrian's schedule, by weekday (0 = Sunday). Sunday's
 * services (10 AM to 12 NN and 3 to 5 PM) and the hours around them stay
 * closed; Monday and Saturday belong to the Sports Ministry.
 */
export const RENTAL_SCHEDULE: Record<number, RentalWindow[]> = {
  0: [
    { sport: "pickleball", from: 12, to: 14 },
    { sport: "pickleball", from: 17, to: 22 },
  ],
  1: [],
  2: [
    { sport: "volleyball", from: 7, to: 13 },
    { sport: "badminton", from: 13, to: 22 },
  ],
  3: [{ sport: "pickleball", from: 7, to: 18 }],
  4: [{ sport: "pickleball", from: 7, to: 22 }],
  5: [{ sport: "basketball", from: 7, to: 18 }],
  6: [],
};

export const MAX_HOURS = 3;
/** New rentals open this many days ahead, and not for today. */
export const DAYS_AHEAD = 7;

/**
 * What the renter accepts with one tick. The first six are Adrian's rules for
 * the Sports Facility (2026-10-20), shortened; the last two are how paying
 * and moving work.
 */
export const COURT_POLICIES = [
  {
    id: "purpose",
    title: "Honor God",
    body: "The Gym is for Christ-centered fellowship, discipleship, stewardship, unity and service. CCF may stop any activity that is unsafe or goes against CCF's Statement of Faith, values and practices.",
  },
  {
    id: "reschedule",
    title: "Changes by CCF",
    body: "CCF may move or reschedule your rental if something unforeseen comes up.",
  },
  {
    id: "who",
    title: "Who can book",
    body: "Only COS, Ministry Heads, D12 and Dgroup leaders can rent the courts, so someone is accountable for the space.",
  },
  {
    id: "stay",
    title: "Stay in the Gym",
    body: "During your time, stay in the Gym and its restrooms. Please don't wander into other rooms.",
  },
  {
    id: "floor",
    title: "Protect the floor",
    body: "No chairs, tables or anything else that can damage the wooden court.",
  },
  {
    id: "attire",
    title: "Dress for the court",
    body: "Wear proper, decent gym clothes and rubber shoes.",
  },
  {
    id: "payment",
    title: "Pay first",
    body: "Pay with the CCF Centris QR code and upload the screenshot. The team checks every payment, and a booking that wasn't paid is cancelled.",
  },
  {
    id: "no-cancel",
    title: "No cancellations",
    body: "Rentals can't be cancelled or refunded. If plans change, move yours to another open time for the same sport, even on the day itself.",
  },
] as const;

// --- Dates -------------------------------------------------------------------

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const addDays = (key: string, n: number) => {
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekdayOf = (key: string) => toDate(key).getUTCDay();

/** "Tuesday, Oct 21". */
export function dayLabel(date: string): string {
  const d = toDate(date);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
}

/** "7:00 AM", "12 NN", "1:00 PM". */
export function hourLabel(h: number): string {
  if (h === 12) return "12 NN";
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
}

/** "7:00 AM – 9:00 AM". */
export const timeRange = (start: number, hours: number) => `${hourLabel(start)} – ${hourLabel(start + hours)}`;

/** "₱1,350". */
export const peso = (n: number) => `₱${n.toLocaleString("en-US")}`;

/** "Courts 1 & 2", "Court 3", or "The whole court" for volleyball and basketball. */
export function courtsLabel(sport: string, numbers: readonly number[]): string {
  if ((sportInfo(sport)?.courts ?? 1) === 1) return "The whole court";
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.length === 1) return `Court ${sorted[0]}`;
  return `Courts ${sorted.slice(0, -1).join(", ")} & ${sorted[sorted.length - 1]}`;
}

export const priceOf = (sport: string, courts: number, hours: number) => (sportInfo(sport)?.rate ?? 0) * courts * hours;

/**
 * The days a new rental can be for: tomorrow to DAYS_AHEAD days ahead, on
 * days with rentable hours. Moves may also use today.
 */
export function rentalDays(today: string, includeToday = false): string[] {
  const out: string[] = [];
  for (let i = includeToday ? 0 : 1; i <= DAYS_AHEAD; i++) {
    const key = addDays(today, i);
    if (RENTAL_SCHEDULE[weekdayOf(key)].length) out.push(key);
  }
  return out;
}

/** The windows open for one sport on a date. */
export const windowsFor = (date: string, sport?: string) =>
  RENTAL_SCHEDULE[weekdayOf(date)].filter((w) => !sport || w.sport === sport);

/** The sports open on a date, in SPORTS order. */
export const sportsOn = (date: string) =>
  SPORTS.filter((s) => RENTAL_SCHEDULE[weekdayOf(date)].some((w) => w.sport === s.id));

// --- Availability ------------------------------------------------------------

/** A court held for one hour: by a rental, or the whole Gym by a block or event (court 0). */
export interface CourtHold {
  date: string;
  hour: number;
  /** 1–3, or 0 for every court (a room block or an event in the Gym). */
  court: number;
  /** The rental holding it, so a rental being moved doesn't count its own courts as taken. */
  rental?: string;
}

/** How many courts are free for `sport` at `hour` on `date`. */
export function freeCourts(sport: Sport, date: string, hour: number, holds: CourtHold[]): number {
  const total = sportInfo(sport)?.courts ?? 0;
  const here = holds.filter((h) => h.date === date && h.hour === hour);
  if (here.some((h) => h.court === 0)) return 0;
  const taken = new Set(here.map((h) => h.court));
  let free = 0;
  for (let c = 1; c <= total; c++) if (!taken.has(c)) free++;
  return free;
}

/**
 * Courts free through every hour of a booking, counting the same court all
 * the way through (the database gives a group one court for the whole time).
 */
export function freeThrough(sport: Sport, date: string, start: number, hours: number, holds: CourtHold[]): number {
  const total = sportInfo(sport)?.courts ?? 0;
  const span = holds.filter((h) => h.date === date && h.hour >= start && h.hour < start + hours);
  if (span.some((h) => h.court === 0)) return 0;
  const taken = new Set(span.map((h) => h.court));
  let free = 0;
  for (let c = 1; c <= total; c++) if (!taken.has(c)) free++;
  return free;
}

/**
 * The start times a booking of `hours` for `sport` can take on `date`: inside
 * one window, starting after `nowHour` when the date is today (pass -1
 * otherwise), with at least `courts` free throughout.
 */
export function openStarts(
  sport: Sport,
  date: string,
  hours: number,
  courts: number,
  holds: CourtHold[],
  nowHour = -1,
): number[] {
  const out: number[] = [];
  for (const w of windowsFor(date, sport)) {
    for (let h = w.from; h + hours <= w.to; h++) {
      if (h <= nowHour) continue;
      if (freeThrough(sport, date, h, hours, holds) >= courts) out.push(h);
    }
  }
  return out;
}

/** The hour now in Manila, for today's start times. */
export const manilaHour = (at: Date = new Date()) => (at.getUTCHours() + 8) % 24;

// --- Checking a booking ------------------------------------------------------

export interface CourtBookingInput {
  sport: Sport;
  date: string;
  start: number;
  hours: number;
  courts: number;
  renterName: string;
  contactMobile: string;
  renterEmail: string;
}

export type CourtFieldErrors = Partial<Record<keyof CourtBookingInput | "policies" | "proof", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The booking a renter sent, checked against the schedule (not against other
 * bookings: the database does that). `today` is Manila's date.
 */
export function parseCourtBooking(
  form: FormData,
  today: string,
): { ok: true; value: CourtBookingInput } | { ok: false; fieldErrors: CourtFieldErrors } {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const errors: CourtFieldErrors = {};

  const date = get("date");
  if (!rentalDays(today).includes(date)) errors.date = "Pick one of the days listed.";

  const sport = get("sport") as Sport;
  const info = sportInfo(sport);
  if (!info) errors.sport = "Pick a sport.";
  else if (!errors.date && !windowsFor(date, sport).length) errors.sport = `${info.name} isn't open on that day.`;

  const hours = Number(get("hours"));
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS) errors.hours = `Pick 1 to ${MAX_HOURS} hours.`;

  const courts = info?.courts === 1 ? 1 : Number(get("courts"));
  if (info && (!Number.isInteger(courts) || courts < 1 || courts > info.courts)) {
    errors.courts = `Pick 1 to ${info.courts} courts.`;
  }

  const start = Number(get("start"));
  if (!errors.date && !errors.sport && !errors.hours) {
    const fits = windowsFor(date, sport).some((w) => Number.isInteger(start) && start >= w.from && start + hours <= w.to);
    if (!fits) errors.start = "Pick one of the start times listed.";
  }

  const renterName = get("renter_name").replace(/\s+/g, " ");
  if (renterName.length < 2 || renterName.length > 120) errors.renterName = "Enter your name.";

  const contactMobile = normalizePhMobile(get("contact_mobile")) ?? "";
  if (!contactMobile) errors.contactMobile = "Enter a mobile number like 0917 123 4567.";

  const renterEmail = get("renter_email").toLowerCase();
  if (!EMAIL.test(renterEmail) || renterEmail.length > 200) errors.renterEmail = "Enter an email address for the confirmation.";

  if (COURT_POLICIES.some((p) => form.get(`policy_${p.id}`) !== "on")) {
    errors.policies = "Accept the rental rules to book.";
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { sport, date, start, hours, courts, renterName, contactMobile, renterEmail } };
}

/**
 * Where a rental can move to: a day from today to DAYS_AHEAD ahead, and a
 * start inside one of its sport's windows that hasn't begun. Null when it
 * can't. A rental that has already started can't move.
 */
export function moveError(
  r: { sport: string; booked_on: string; start_hour: number; hours: number },
  to: { date: string; start: number },
  today: string,
  nowHour: number,
): string | null {
  if (r.booked_on < today || (r.booked_on === today && r.start_hour <= nowHour)) {
    return "This rental has already started, so it can't be moved.";
  }
  if (!rentalDays(today, true).includes(to.date)) return "Pick a day within the next week.";
  const fits = windowsFor(to.date, r.sport).some((w) => to.start >= w.from && to.start + r.hours <= w.to);
  if (!Number.isInteger(to.start) || !fits) return `${sportName(r.sport)} isn't open then. Pick one of the times listed.`;
  if (to.date === today && to.start <= nowHour) return "That time has started. Pick a later one.";
  if (to.date === r.booked_on && to.start === r.start_hour) return "That's the time you have. Pick a different one.";
  return null;
}

// --- The admin boards --------------------------------------------------------

/** A rental as the admin boards read it (a Gym booking among the room requests). */
export interface BoardRental {
  id: string;
  renter_name: string;
  contact_mobile: string;
  dgroup_name?: string | null;
  sport: string;
  booked_on: string;
  start_hour: number;
  hours: number;
  court_numbers: number[];
  status: string;
}

/** Manila "YYYY-MM-DD" and hour as an ISO instant. */
const manilaIso = (date: string, hour: number) =>
  new Date(new Date(`${date}T00:00:00+08:00`).getTime() + hour * 3_600_000).toISOString();

/**
 * Rentals shaped like room bookings in the Gym, so Today, This week and the
 * Room calendar show them with everything else booked there (2026-10-20).
 * They're confirmed, so they read as approved, and they open the rental.
 */
export function rentalsAsGymBookings(rentals: BoardRental[]) {
  return rentals
    .filter((r) => r.status === "confirmed")
    .map((r) => ({
      id: r.id,
      contact_name: r.renter_name,
      contact_mobile: r.contact_mobile,
      organization: r.dgroup_name ?? null,
      activity_name: `${sportName(r.sport)} · ${courtsLabel(r.sport, r.court_numbers)}`,
      participants: 0,
      facility_name: "Gym",
      facility_slug: "sports-hall",
      starts_at: manilaIso(r.booked_on, r.start_hour),
      ends_at: manilaIso(r.booked_on, r.start_hour + r.hours),
      status: "approved",
      href: `/admin/courts/${r.id}`,
    }));
}

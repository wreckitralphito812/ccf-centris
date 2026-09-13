/**
 * Dgroup table reservations: the rooms, tables, nights and time slots, and the
 * rules for assigning a table.
 *
 * The TABLES are real — transcribed from the CCF Centris floor plans
 * (DGROUP PLAN and WELCOME PLAN), including each table's seat count. Labels
 * are the plain numbers printed on those plans, so a member told "Table 7"
 * can match it against the drawing on the wall. Numbers repeat across the two
 * rooms, which is fine: a table is identified by room + label everywhere (see
 * tableKey), and the room name is always shown alongside.
 *
 * The NIGHTS and TIME SLOTS are still placeholders awaiting CCF Centris.
 *
 * The page, the form, and the assignment all read from here, so changing a
 * value here changes it everywhere.
 */

// --- Configuration (placeholders) -------------------------------------------

export interface DgroupTable {
  label: string;
  seats: number;
}

export interface DgroupRoom {
  slug: string;
  name: string;
  tables: DgroupTable[];
}

export interface DgroupSlot {
  id: string;
  label: string;
  /** Manila wall-clock time, "HH:MM". */
  start: string;
  end: string;
}

/** `count` consecutively numbered tables of the same size, starting at `first`. */
const run = (count: number, seats: number, first: number): DgroupTable[] =>
  Array.from({ length: count }, (_, i) => ({ label: String(first + i), seats }));

/** Only these two rooms take Dgroup reservations for now. */
export const DGROUP_ROOMS: DgroupRoom[] = [
  {
    // DGROUP PLAN: 11 tables, 38 seats. One long 8-seater, then progressively
    // smaller clusters down to four 2-seaters — so a pair gets a 2-seater and
    // the 8-seater stays free for the group that actually needs it.
    slug: "dgroup-lounge",
    name: "Dgroup Lounge",
    tables: [
      ...run(1, 8, 1), // 1
      ...run(4, 4, 2), // 2–5
      ...run(2, 3, 6), // 6–7
      ...run(4, 2, 8), // 8–11
    ],
  },
  {
    // WELCOME PLAN: 15 tables of 4, 60 seats. Tables 1–3 are the lounge-style
    // groupings along the west wall and 4–15 the square clusters; the plan
    // seats all fifteen at four, so they are one pool here.
    slug: "welcome-center",
    name: "Welcome Center",
    tables: run(15, 4, 1),
  },
];

/** Nights open for booking, as JavaScript weekdays: 1 is Monday, 5 Friday. */
export const DGROUP_NIGHTS = [1, 2, 3, 4, 5];

export const DGROUP_SLOTS: DgroupSlot[] = [
  { id: "1800", label: "6:00 – 8:00 PM", start: "18:00", end: "20:00" },
  { id: "2000", label: "8:00 – 10:00 PM", start: "20:00", end: "22:00" },
];

/** How many days ahead a night can be booked. */
export const BOOKING_WINDOW_DAYS = 14;

export const HOUSE_RULES = [
  {
    id: "claygo",
    title: "CLAYGO — Clean As You Go",
    body: "Placeholder. Clear your table, return chairs, and take your trash with you before you leave.",
  },
  {
    id: "terms",
    title: "CCF terms and conditions",
    body: "Placeholder. The CCF Centris facility terms and conditions will be published here.",
  },
];

// --- Rules -------------------------------------------------------------------

export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/** The largest group any single table can seat. */
export const MAX_GROUP_SIZE = Math.max(
  ...DGROUP_ROOMS.flatMap((r) => r.tables.map((t) => t.seats)),
);

export interface TableChoice {
  roomSlug: string;
  roomName: string;
  label: string;
  seats: number;
}

/** Identity of a table across rooms, e.g. "dgroup-lounge/L3". */
export function tableKey(roomSlug: string, label: string): string {
  return `${roomSlug}/${label}`;
}

/**
 * Free tables that can seat the group, best fit first: the smallest table
 * that fits, so larger tables stay free for larger groups. Ties go to the room
 * listed first, then to table order. `taken` holds tableKey()s already booked
 * for the slot.
 */
export function candidateTables(
  groupSize: number,
  room: string,
  taken: ReadonlySet<string>,
  rooms: DgroupRoom[] = DGROUP_ROOMS,
): TableChoice[] {
  return rooms
    .map((r, roomOrder) => ({ r, roomOrder }))
    .filter(({ r }) => room === "either" || r.slug === room)
    .flatMap(({ r, roomOrder }) =>
      r.tables.map((t, tableOrder) => ({ r, t, roomOrder, tableOrder })),
    )
    .filter(({ r, t }) => t.seats >= groupSize && !taken.has(tableKey(r.slug, t.label)))
    .sort(
      (a, b) =>
        a.t.seats - b.t.seats || a.roomOrder - b.roomOrder || a.tableOrder - b.tableOrder,
    )
    .map(({ r, t }) => ({ roomSlug: r.slug, roomName: r.name, label: t.label, seats: t.seats }));
}

/** The bookable nights from `today` (Manila "YYYY-MM-DD"), today included. */
export function bookableNights(
  today: string,
  windowDays: number = BOOKING_WINDOW_DAYS,
  nights: number[] = DGROUP_NIGHTS,
): string[] {
  const [y, m, d] = today.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i <= windowDays; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    if (nights.includes(day.getUTCDay())) out.push(day.toISOString().slice(0, 10));
  }
  return out;
}

/** Minutes since midnight for "HH:MM". */
function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Slots still open on `date`, given today's date and the Manila time now. */
export function openSlots(date: string, today: string, nowMinutes: number): DgroupSlot[] {
  if (date !== today) return DGROUP_SLOTS;
  return DGROUP_SLOTS.filter((s) => minutesOf(s.start) > nowMinutes);
}

/** Manila minutes since midnight for an instant. */
export function manilaMinutes(at: Date = new Date()): number {
  return (at.getUTCHours() * 60 + at.getUTCMinutes() + 8 * 60) % (24 * 60);
}

export function nightLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const month = day.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${WEEKDAY_NAMES[day.getUTCDay()]}, ${month} ${d}`;
}

// --- Form parsing ------------------------------------------------------------

export interface DgroupBookingInput {
  date: string;
  slotId: string;
  room: string;
  leaderName: string;
  contactMobile: string;
  groupSize: number;
}

export type DgroupFieldErrors = Partial<Record<keyof DgroupBookingInput | "agree", string>>;

export function parseDgroupBooking(
  form: FormData,
  today: string,
  nowMinutes: number,
): { ok: true; value: DgroupBookingInput } | { ok: false; fieldErrors: DgroupFieldErrors } {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const errors: DgroupFieldErrors = {};

  const date = get("date");
  if (!bookableNights(today).includes(date)) {
    errors.date = "Pick one of the nights listed.";
  }

  const slotId = get("slot");
  if (!errors.date && !openSlots(date, today, nowMinutes).some((s) => s.id === slotId)) {
    errors.slotId = "Pick a time slot that hasn't started yet.";
  }

  const room = get("room") || "either";
  if (room !== "either" && !DGROUP_ROOMS.some((r) => r.slug === room)) {
    errors.room = "Pick a room.";
  }

  const leaderName = get("leader_name").replace(/\s+/g, " ");
  if (leaderName.length < 2 || leaderName.length > 120) {
    errors.leaderName = "Enter the Dgroup leader's name.";
  }

  const contactMobile = get("contact_mobile").replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ");
  if (contactMobile.replace(/\D/g, "").length < 7 || contactMobile.length > 30) {
    errors.contactMobile = "Enter a contact number we can reach.";
  }

  const groupSize = Number(get("group_size"));
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    errors.groupSize = "Enter how many people are coming.";
  } else if (groupSize > MAX_GROUP_SIZE) {
    errors.groupSize = `The largest table seats ${MAX_GROUP_SIZE}. For a bigger group, book two tables or use a ministry reservation.`;
  }

  if (form.get("agree") !== "on") {
    errors.agree = "Agree to the house rules to book.";
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { date, slotId, room, leaderName, contactMobile, groupSize } };
}

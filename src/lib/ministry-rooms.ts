/**
 * Rooms a ministry can request, and when.
 *
 * From Adrian Camacho (facilities), 2026-09-26, and CCF Centris's own Venue
 * Reservation Form. The four multipurpose halls are named after the Gospels;
 * the old "MPH n" number stays in brackets while people learn the new names.
 * Capacities are the form's figures for each set-up.
 *
 * The Dgroup Lounge and the Welcome Center belong to Dgroups on weekday
 * afternoons and evenings (booked by the table at /reserve/dgroup), so
 * ministries can only request them on weekday mornings and Saturdays. Nothing
 * is booked on Sundays: that's for the services.
 *
 * This file is shared by the request form, the server action that checks each
 * request, and the admin emails, so the rules can't drift apart.
 */

export type Setup = "classroom" | "tables" | "open" | "furniture";

/**
 * Set-ups (Ralph, 2026-10-10): the four halls take classroom, tables or no
 * tables at all; the Welcome Center and the Dgroup Lounge are used as
 * furnished only, since their layout can't be changed.
 */
export const SETUPS: { id: Setup; label: string; hint: string }[] = [
  { id: "classroom", label: "Classroom", hint: "Rows of chairs facing a speaker at the front" },
  { id: "tables", label: "Tables", hint: "Tables with chairs. Say how many of each kind you need" },
  { id: "open", label: "No tables", hint: "An open floor, for dance rehearsals or choir practice" },
  { id: "furniture", label: "As furnished", hint: "The Welcome Center or Dgroup Lounge as laid out. It can't be rearranged" },
];

export type TableKind = "square" | "medium" | "large";
export type TableCounts = Partial<Record<TableKind, number>>;

/**
 * The center's tables (Ralph, 2026-10-10). `stock` is how many it owns,
 * shared by every request at the same time, not a limit per request.
 */
export const TABLE_KINDS: { id: TableKind; label: string; seats: number; stock: number }[] = [
  { id: "square", label: "Square", seats: 4, stock: 20 },
  { id: "medium", label: "Medium rectangle", seats: 6, stock: 20 },
  { id: "large", label: "Large rectangle", seats: 8, stock: 40 },
];

/** People the tables seat. */
export const tableSeats = (t: TableCounts | null | undefined) =>
  TABLE_KINDS.reduce((n, k) => n + (t?.[k.id] ?? 0) * k.seats, 0);

/** "3 square, 2 large rectangle tables", or "None". */
export function tablesSummary(t: TableCounts | null | undefined): string {
  const parts = TABLE_KINDS.flatMap((k) => (t?.[k.id] ? [`${t[k.id]} ${k.label.toLowerCase()}`] : []));
  return parts.length ? `${parts.join(", ")} table${TABLE_KINDS.reduce((n, k) => n + (t?.[k.id] ?? 0), 0) === 1 ? "" : "s"}` : "None";
}

/** Tables another request holds, and when. */
export type TableHold = [Minutes, Minutes, TableCounts];

/**
 * Most tables of each kind in use at any one moment between `start` and
 * `end`, from the requests that hold them. A request that ends before
 * another starts doesn't add to it.
 */
export function tablesInUse(holds: TableHold[], start: Minutes, end: Minutes): Record<TableKind, number> {
  const inside = holds.filter(([a, b]) => a < end && b > start);
  const moments = [start, ...inside.map(([a]) => a).filter((a) => a > start)];
  const out = { square: 0, medium: 0, large: 0 } as Record<TableKind, number>;
  for (const at of moments) {
    for (const k of TABLE_KINDS) {
      const n = inside.filter(([a, b]) => a <= at && b > at).reduce((sum, [, , t]) => sum + (t[k.id] ?? 0), 0);
      out[k.id] = Math.max(out[k.id], n);
    }
  }
  return out;
}

export interface MinistryRoom {
  /** The facility slug in the database. Kept from before the rename. */
  slug: string;
  name: string;
  /** People per set-up. A set-up the room doesn't offer is left out. */
  capacity: Partial<Record<Setup, number>>;
  /** Also used by Dgroups on weekday afternoons. */
  dgroupRoom: boolean;
}

// "No tables" seats as many as classroom: the floor is the same size.
export const MINISTRY_ROOMS: MinistryRoom[] = [
  { slug: "multipurpose-hall-1", name: "John (MPH 1)", capacity: { classroom: 90, tables: 54, open: 90 }, dgroupRoom: false },
  { slug: "multipurpose-hall-2", name: "Luke (MPH 2)", capacity: { classroom: 80, tables: 54, open: 80 }, dgroupRoom: false },
  { slug: "multipurpose-hall-3", name: "Matthew (MPH 3)", capacity: { classroom: 90, tables: 60, open: 90 }, dgroupRoom: false },
  { slug: "multipurpose-hall-4", name: "Mark (MPH 4)", capacity: { classroom: 56, tables: 36, open: 56 }, dgroupRoom: false },
  { slug: "welcome-center", name: "Welcome Center", capacity: { furniture: 66 }, dgroupRoom: true },
  { slug: "dgroup-lounge", name: "Dgroup Lounge", capacity: { furniture: 42 }, dgroupRoom: true },
];

export const ministryRoom = (slug: string) => MINISTRY_ROOMS.find((r) => r.slug === slug) ?? null;

/** Minutes after midnight, Manila time. */
export type Minutes = number;

export const toMinutes = (hhmm: string): Minutes => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const toHHMM = (m: Minutes) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** "13:30" → "1:30 PM", "12:00" → "12 NN". */
export function timeLabel(m: Minutes): string {
  if (m === 12 * 60) return "12 NN";
  const h = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${min ? `:${String(min).padStart(2, "0")}` : ":00"} ${h < 12 ? "AM" : "PM"}`;
}

const OPEN = toMinutes("09:00");
const NOON = toMinutes("12:00");
const CLOSE = toMinutes("21:30");

/** Requests start and end on the half hour. */
export const STEP_MINUTES = 30;

/** Day of the week for a "YYYY-MM-DD" date, read as a calendar date: 0 = Sunday. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** When a ministry may use this room on this date. Empty when it's closed. */
export function ministryWindow(slug: string, date: string): { from: Minutes; to: Minutes } | null {
  const room = ministryRoom(slug);
  if (!room) return null;
  const wd = weekdayOf(date);
  if (wd === 0) return null;
  if (room.dgroupRoom && wd !== 6) return { from: OPEN, to: NOON };
  return { from: OPEN, to: CLOSE };
}

/** The widest hours any room is open on this date, for the time pickers. */
export function dayWindow(date: string): { from: Minutes; to: Minutes } | null {
  return weekdayOf(date) === 0 ? null : { from: OPEN, to: CLOSE };
}

/** Why a room can't be used for this time, or null when it can. */
export function closedReason(slug: string, date: string, start: Minutes, end: Minutes): string | null {
  const w = ministryWindow(slug, date);
  if (!w) return "Closed on Sundays";
  if (start >= w.from && end <= w.to) return null;
  const room = ministryRoom(slug);
  if (room?.dgroupRoom && w.to === NOON) return "Weekdays until 12 NN only. Dgroups use it after.";
  return `Open ${timeLabel(w.from)} to ${timeLabel(w.to)}`;
}

/**
 * The three usual times, so most requests are one tap. Anything else goes
 * through "Other time". Design review, 2026-09-30.
 */
export const TIME_BLOCKS: { id: string; label: string; from: Minutes; to: Minutes }[] = [
  { id: "morning", label: "Morning", from: OPEN, to: NOON },
  { id: "afternoon", label: "Afternoon", from: toMinutes("13:00"), to: toMinutes("17:00") },
  { id: "evening", label: "Evening", from: toMinutes("18:00"), to: CLOSE },
];

/** Requests need this many days' notice: on Monday, Wednesday is the earliest (Ralph, 2026-10-10). */
export const LEAD_DAYS = 2;

const plusDays = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** The earliest date a room can be requested for: LEAD_DAYS on, skipping Sundays. */
export function firstOpenDay(today: string): string {
  let day = plusDays(today, LEAD_DAYS);
  while (weekdayOf(day) === 0) day = plusDays(day, 1);
  return day;
}

/** Plain-language hours, for the page and the policies. */
export const HOURS_SUMMARY: [string, string][] = [
  ["John, Luke, Matthew, Mark", "Monday to Saturday, 9:00 AM to 9:30 PM"],
  ["Welcome Center, Dgroup Lounge", "Weekdays 9:00 AM to 12 NN, and Saturdays 9:00 AM to 9:30 PM. Dgroups use both rooms on weekday afternoons and evenings."],
  ["Sundays", "No room requests. The center is used for the services."],
];

/** From the Venue Reservation Form. The lead ministry when several are involved. */
export const MINISTRIES = [
  "Across",
  "Admin / Finance",
  "B1G",
  "CCF Net",
  "Comms",
  "Discipleship Management",
  "Elevate",
  "Exalt",
  "Filchi (FAM)",
  "Filchi (Friends)",
  "Filchi (NBHD)",
  "GLC",
  "Host",
  "Live Prod",
  "Living Free Ministry",
  "MoveMENt",
  "NxtGen",
  "Pastoral Care",
  "Sports",
  "Welcome Ministry",
  "W.O.W. Helpmate",
] as const;

/** Equipment the facilities team can set up, with how many of each exist. */
export const EQUIPMENT: { id: string; label: string; max: number }[] = [
  { id: "mic_wireless", label: "Wireless mic", max: 2 },
  { id: "mic_wired", label: "Wired mic", max: 2 },
  { id: "mixer", label: "Mixer", max: 1 },
  { id: "interactive_screen", label: "Interactive screen", max: 1 },
  { id: "tv", label: "TV", max: 1 },
  { id: "hdmi", label: "HDMI cable", max: 1 },
  { id: "extension", label: "Extension cord", max: 1 },
  { id: "podium", label: "Podium", max: 1 },
  { id: "percolator", label: "Coffee percolator", max: 1 },
];

export const FOOD: { id: string; label: string; hint?: string }[] = [
  { id: "none", label: "No food" },
  { id: "own", label: "We'll bring our own", hint: "No permit needed" },
  { id: "catered", label: "Catered", hint: "Needs a permit. The team will tell you how." },
];

/** "2 wireless mics, podium" from the saved counts. */
export function equipmentSummary(counts: Record<string, number> | null | undefined): string {
  const parts = EQUIPMENT.flatMap((e) => {
    const n = counts?.[e.id] ?? 0;
    if (!n) return [];
    return [n > 1 ? `${n} ${e.label.toLowerCase()}s` : e.label];
  });
  return parts.length ? parts.join(", ") : "None";
}

export const foodLabel = (id: string | null | undefined) => FOOD.find((f) => f.id === id)?.label ?? "Not said";
export const setupLabel = (id: string | null | undefined) => SETUPS.find((s) => s.id === id)?.label ?? id ?? "Not said";

/** The set-ups a room offers, in SETUPS order. */
export const setupsFor = (r: MinistryRoom) => SETUPS.filter((s) => r.capacity[s.id]);

/** Meetings that get the rooms first when two requests clash. From the form. */
export const PRIORITY_MEETINGS = [
  "COS (NE and Centris) meetings, huddles and Dgroups",
  "COS wives (NE and Centris) meetings, huddles and Dgroups",
  "COS and ministry lead meetings",
  "Ministry lead and core meetings",
  "Ministry and volunteer general assemblies",
];

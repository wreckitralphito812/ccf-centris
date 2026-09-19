/**
 * Dgroup table reservations: the rooms, tables, time slots, booking window,
 * policies, and the rules for assigning tables.
 *
 * Everything here was set by CCF Centris for the October 2026 launch:
 * - Two rooms, the Dgroup Lounge and the Welcome Center, with the tables on
 *   Adrian Camacho's floor plans (DGROUP PLAN and WELCOME PLAN). Labels are the
 *   numbers printed on those plans, so "Table 7" matches the drawing on the wall.
 * - Monday to Friday, three slots: 1:00–3:30, 4:00–6:30, 7:00–9:30 PM.
 * - Bookings open on Sunday, October 4, 2026. From then on a leader can book
 *   the rest of the current week; the following week opens each Sunday.
 * - One night and one slot per booking. A leader can hold several bookings in a
 *   week, but each goes through the form, and the policies, on its own.
 * - The site picks the room and the tables. It uses one table when one fits and
 *   joins neighbouring tables only when the group needs more seats.
 *
 * The page, the form, the actions, the email and the floor plans all read from
 * here, so changing a value here changes it everywhere.
 */

// --- Configuration -----------------------------------------------------------

export interface DgroupTable {
  label: string;
  seats: number;
}

export interface DgroupRoom {
  slug: string;
  name: string;
  tables: DgroupTable[];
  /**
   * Pairs of tables that stand next to each other and can be pushed together
   * for a bigger group. Confirmed against the floor plans by CCF Centris.
   */
  joins: [string, string][];
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

/** Consecutive pairs along a line of tables: [a,b], [b,c], … */
const line = (...labels: number[]): [string, string][] =>
  labels.slice(1).map((l, i) => [String(labels[i]), String(l)]);

export const DGROUP_ROOMS: DgroupRoom[] = [
  {
    // DGROUP PLAN: 11 tables, 38 seats. One long 8-seater (never joined), four
    // 4-seat clusters in a square, two 3-seat benches, four 2-seat rounds.
    slug: "dgroup-lounge",
    name: "Dgroup Lounge",
    tables: [...run(1, 8, 1), ...run(4, 4, 2), ...run(2, 3, 6), ...run(4, 2, 8)],
    joins: [
      ["2", "3"], ["4", "5"], ["2", "4"], ["3", "5"],
      ["6", "7"],
      ["8", "9"], ["10", "11"],
    ],
  },
  {
    // WELCOME PLAN: 15 tables of 4, 60 seats. Tables 1–3 are the lounge sets
    // down the west wall; 4–9 and 10–15 are two columns of square clusters.
    // The wall sets are not joined to the clusters.
    slug: "welcome-center",
    name: "Welcome Center",
    tables: run(15, 4, 1),
    joins: [
      ...line(1, 2, 3),
      ...line(4, 5, 6, 7, 8, 9),
      ...line(10, 11, 12, 13, 14, 15),
      ["4", "10"], ["5", "11"], ["6", "12"], ["7", "13"], ["8", "14"], ["9", "15"],
    ],
  },
];

/** Bookable weekdays, as JavaScript weekdays: 1 is Monday, 5 Friday. */
export const DGROUP_NIGHTS = [1, 2, 3, 4, 5];

export const DGROUP_SLOTS: DgroupSlot[] = [
  { id: "1300", label: "1:00 – 3:30 PM", start: "13:00", end: "15:30" },
  { id: "1600", label: "4:00 – 6:30 PM", start: "16:00", end: "18:30" },
  { id: "1900", label: "7:00 – 9:30 PM", start: "19:00", end: "21:30" },
];

/** The first day bookings open, in Manila. A Sunday, so it opens Oct 5–9. */
export const DGROUP_OPENS_ON = "2026-10-04";

/** The largest group the site will seat, joining up to MAX_JOINED tables. */
export const MAX_GROUP_SIZE = 12;
export const MAX_JOINED = 3;

/** The policies a leader accepts before a booking is final, as CCF wrote them. */
export const DGROUP_POLICIES = [
  {
    id: "claygo",
    title: "CLAYGO",
    body: "Return tables and chairs to their original positions, clean up any mess, drips and garbage, and properly dispose of your waste.",
  },
  {
    id: "stewards",
    title: "Leave it better",
    body: "Leave the place better than how you found it, as good stewards of God’s resources and provisions.",
  },
  {
    id: "materials",
    title: "CCF materials only",
    body: "Use only CCF-approved materials for your Dgroup, like the 4Ws, GLC, and M.O.T.I.V.A.T.E.",
  },
  {
    id: "respect",
    title: "Respect other Dgroups",
    body: "Keep the noise down, and do not extend your time.",
  },
  {
    id: "dgroup-only",
    title: "For Dgroups only",
    body: "No gambling, drinking, smoking, playing cards, board games, and the like.",
  },
] as const;

// --- Dates -------------------------------------------------------------------

export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const toDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (key: string, n: number) => {
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
};

/**
 * Whether bookings are open on `today` (Manila "YYYY-MM-DD"). `preview` lets a
 * non-production deploy try the flow before launch; see bookingPreview().
 */
export function bookingOpen(today: string, preview = false): boolean {
  return preview || today >= DGROUP_OPENS_ON;
}

/**
 * The dates a leader can book from `today`, today included:
 * - Monday to Saturday: the weekdays left in the current week.
 * - Sunday: Monday to Friday of the week ahead, which opens that day.
 */
export function bookableNights(today: string, nights: number[] = DGROUP_NIGHTS): string[] {
  const dow = toDate(today).getUTCDay();
  const from = dow === 0 ? 1 : 0;
  const to = dow === 0 ? 5 : 6 - dow;
  const out: string[] = [];
  for (let i = from; i <= to; i++) {
    const key = addDays(today, i);
    if (nights.includes(toDate(key).getUTCDay())) out.push(key);
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
  const day = toDate(date);
  const month = day.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${WEEKDAY_NAMES[day.getUTCDay()]}, ${month} ${day.getUTCDate()}`;
}

/** "Sunday, October 4" for the opening notice. */
export function longDateLabel(date: string): string {
  const day = toDate(date);
  const month = day.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `${WEEKDAY_NAMES[day.getUTCDay()]}, ${month} ${day.getUTCDate()}`;
}

export const slotLabel = (id: string) => DGROUP_SLOTS.find((s) => s.id === id)?.label ?? id;
export const roomName = (slug: string) => DGROUP_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

/** "Table 4" or "Tables 4 + 5". */
export function tablesLabel(labels: readonly string[]): string {
  return `${labels.length === 1 ? "Table" : "Tables"} ${labels.join(" + ")}`;
}

// --- Assignment --------------------------------------------------------------

export interface TableChoice {
  roomSlug: string;
  roomName: string;
  /** One label, or several neighbouring tables joined together. */
  labels: string[];
  seats: number;
}

/** Identity of a table across rooms, e.g. "dgroup-lounge/3". */
export function tableKey(roomSlug: string, label: string): string {
  return `${roomSlug}/${label}`;
}

/**
 * Every set of up to `maxJoined` tables in a room that stand together: single
 * tables, and groups where each table touches another in the group.
 */
export function tableGroups(room: DgroupRoom, maxJoined: number = MAX_JOINED): string[][] {
  const next = new Map<string, Set<string>>();
  for (const t of room.tables) next.set(t.label, new Set());
  for (const [a, b] of room.joins) {
    next.get(a)?.add(b);
    next.get(b)?.add(a);
  }
  const order = new Map(room.tables.map((t, i) => [t.label, i]));
  const sort = (g: string[]) => [...g].sort((a, b) => order.get(a)! - order.get(b)!);

  const seen = new Set<string>();
  const out: string[][] = [];
  let frontier = room.tables.map((t) => [t.label]);
  for (let size = 1; size <= maxJoined && frontier.length; size++) {
    const grown: string[][] = [];
    for (const group of frontier) {
      const key = sort(group).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sort(group));
      for (const label of group) {
        for (const n of next.get(label) ?? []) {
          if (!group.includes(n)) grown.push([...group, n]);
        }
      }
    }
    frontier = grown;
  }
  return out;
}

/**
 * Free table sets that seat the group, best first:
 * 1. fewest tables, so tables are joined only when the group needs it;
 * 2. fewest seats, so larger tables stay free for larger groups;
 * 3. then room order and table order.
 * `taken` holds tableKey()s already booked for the night and slot.
 */
export function candidateTables(
  groupSize: number,
  taken: ReadonlySet<string>,
  rooms: DgroupRoom[] = DGROUP_ROOMS,
  maxJoined: number = MAX_JOINED,
): TableChoice[] {
  const options = rooms.flatMap((room, roomOrder) => {
    const seatsOf = new Map(room.tables.map((t) => [t.label, t.seats]));
    const position = new Map(room.tables.map((t, i) => [t.label, i]));
    return tableGroups(room, maxJoined)
      .filter((g) => g.every((l) => !taken.has(tableKey(room.slug, l))))
      .map((labels) => ({
        choice: {
          roomSlug: room.slug,
          roomName: room.name,
          labels,
          seats: labels.reduce((n, l) => n + seatsOf.get(l)!, 0),
        },
        roomOrder,
        first: position.get(labels[0])!,
      }))
      .filter((o) => o.choice.seats >= groupSize);
  });

  return options
    .sort(
      (a, b) =>
        a.choice.labels.length - b.choice.labels.length ||
        a.choice.seats - b.choice.seats ||
        a.roomOrder - b.roomOrder ||
        a.first - b.first,
    )
    .map((o) => o.choice);
}

// --- Form parsing ------------------------------------------------------------

export interface DgroupBookingInput {
  date: string;
  slotId: string;
  leaderName: string;
  contactMobile: string;
  leaderEmail: string;
  groupSize: number;
}

export type DgroupFieldErrors = Partial<Record<keyof DgroupBookingInput | "policies", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseWhen(
  form: FormData,
  today: string,
  nowMinutes: number,
  errors: DgroupFieldErrors,
) {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const date = get("date");
  if (!bookableNights(today).includes(date)) errors.date = "Pick one of the days listed.";
  const slotId = get("slot");
  if (!errors.date && !openSlots(date, today, nowMinutes).some((s) => s.id === slotId)) {
    errors.slotId = "Pick a time slot that hasn't started yet.";
  }
  const groupSize = Number(get("group_size"));
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    errors.groupSize = "Enter how many people are coming.";
  } else if (groupSize > MAX_GROUP_SIZE) {
    errors.groupSize = `We can seat up to ${MAX_GROUP_SIZE}. For a bigger group, contact the center.`;
  }
  return { date, slotId, groupSize };
}

export function parseDgroupBooking(
  form: FormData,
  today: string,
  nowMinutes: number,
): { ok: true; value: DgroupBookingInput } | { ok: false; fieldErrors: DgroupFieldErrors } {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const errors: DgroupFieldErrors = {};
  const { date, slotId, groupSize } = parseWhen(form, today, nowMinutes, errors);

  const leaderName = get("leader_name").replace(/\s+/g, " ");
  if (leaderName.length < 2 || leaderName.length > 120) {
    errors.leaderName = "Enter the Dgroup leader's name.";
  }

  const contactMobile = get("contact_mobile").replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ");
  if (contactMobile.replace(/\D/g, "").length < 7 || contactMobile.length > 30) {
    errors.contactMobile = "Enter a contact number we can reach.";
  }

  const leaderEmail = get("leader_email").toLowerCase();
  if (!EMAIL.test(leaderEmail) || leaderEmail.length > 200) {
    errors.leaderEmail = "Enter an email address for the confirmation.";
  }

  if (DGROUP_POLICIES.some((p) => form.get(`policy_${p.id}`) !== "on")) {
    errors.policies = "Accept every policy to confirm the booking.";
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { date, slotId, leaderName, contactMobile, leaderEmail, groupSize } };
}

/** A change to an existing booking: its day, time, and headcount. */
export function parseDgroupChange(
  form: FormData,
  today: string,
  nowMinutes: number,
):
  | { ok: true; value: Pick<DgroupBookingInput, "date" | "slotId" | "groupSize"> }
  | { ok: false; fieldErrors: DgroupFieldErrors } {
  const errors: DgroupFieldErrors = {};
  const value = parseWhen(form, today, nowMinutes, errors);
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value };
}

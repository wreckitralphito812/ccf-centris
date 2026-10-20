/**
 * Admins changing a room request (Adrian, 2026-10-16): the rooms, the day and
 * time, and everything the ministry filled in, for a request waiting for
 * approval or already approved. The requester is emailed a list of what
 * changed. Pure, so the rules and the change list are tested without a
 * database; the server action in actions/admin.ts does the writing.
 *
 * Admins aren't held to the public form's rules (two days' notice, opening
 * hours, the Dgroup rooms' mornings): they may need an exception. Rooms still
 * can't be double-booked; the database refuses that.
 */
import { BOARD_ROOMS } from "@/lib/admin-day";
import {
  EQUIPMENT,
  FOOD,
  SETUPS,
  TABLE_KINDS,
  equipmentSummary,
  foodLabel,
  setupLabel,
  tablesSummary,
  timeLabel,
  toMinutes,
  type TableCounts,
} from "@/lib/ministry-rooms";

/** The rooms an admin can put a request in: the Main Hall, the ministry rooms and the Gym. */
export const EDIT_ROOMS = BOARD_ROOMS;

/** Times an admin can pick: every half hour, 6:00 AM to 10:00 PM. */
export const EDIT_TIMES: string[] = Array.from({ length: 33 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

export interface RoomRequestDetails {
  rooms: string[];
  date: string;
  start: string;
  end: string;
  activity_name: string;
  organization: string;
  participants: number;
  layout: string;
  tables: TableCounts;
  equipment: Record<string, number>;
  food: string;
  purpose: string;
  contact_name: string;
  contact_email: string;
  contact_mobile: string;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export function parseRoomEdit(
  fd: FormData,
): { ok: true; value: RoomRequestDetails } | { ok: false; error: string } {
  const rooms = [...new Set(fd.getAll("room").map(String))];
  const date = str(fd, "date");
  const start = str(fd, "start");
  const end = str(fd, "end");
  const participants = Number(str(fd, "participants"));
  const layout = str(fd, "layout");
  const food = str(fd, "food");
  const contact_email = str(fd, "contact_email");

  if (!rooms.length) return { ok: false, error: "Pick at least one room." };
  if (rooms.some((r) => !EDIT_ROOMS.some((e) => e.slug === r))) return { ok: false, error: "One of those rooms isn't on the list." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return { ok: false, error: "Pick a day." };
  if (!EDIT_TIMES.includes(start) || !EDIT_TIMES.includes(end)) return { ok: false, error: "Pick a start and end time." };
  if (toMinutes(end) <= toMinutes(start)) return { ok: false, error: "The end time must be after the start." };
  const activity_name = str(fd, "activity_name");
  if (activity_name.length < 2 || activity_name.length > 120) return { ok: false, error: "Give the event a name (up to 120 characters)." };
  const organization = str(fd, "organization");
  if (organization.length > 80) return { ok: false, error: "Keep the ministry name under 80 characters." };
  if (!Number.isInteger(participants) || participants < 1 || participants > 2000) return { ok: false, error: "Enter how many people." };
  if (layout && !SETUPS.some((s) => s.id === layout)) return { ok: false, error: "Pick a set-up." };
  if (food && !FOOD.some((f) => f.id === food)) return { ok: false, error: "Pick a food option." };

  const tables: TableCounts = {};
  if (layout === "tables") {
    for (const k of TABLE_KINDS) {
      const n = Number(str(fd, `tables_${k.id}`) || 0);
      if (!Number.isInteger(n) || n < 0 || n > k.stock) return { ok: false, error: `The center has ${k.stock} ${k.label.toLowerCase()} tables.` };
      if (n) tables[k.id] = n;
    }
  }
  const equipment: Record<string, number> = {};
  for (const item of EQUIPMENT) {
    const n = Number(str(fd, `eq_${item.id}`) || 0);
    if (Number.isInteger(n) && n > 0) equipment[item.id] = Math.min(n, item.max);
  }

  const contact_name = str(fd, "contact_name");
  if (contact_name.length < 2 || contact_name.length > 120) return { ok: false, error: "Enter the requester's name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact_email) || contact_email.length > 200) return { ok: false, error: "Enter the requester's email." };
  const contact_mobile = str(fd, "contact_mobile");
  if (contact_mobile.length > 30) return { ok: false, error: "Keep the mobile number under 30 characters." };
  const purpose = str(fd, "purpose");
  if (purpose.length > 1000) return { ok: false, error: "Keep the notes under 1,000 characters." };

  return {
    ok: true,
    value: {
      rooms: EDIT_ROOMS.filter((r) => rooms.includes(r.slug)).map((r) => r.slug),
      date,
      start,
      end,
      activity_name,
      organization,
      participants,
      layout,
      tables,
      equipment,
      food,
      purpose,
      contact_name,
      contact_email,
      contact_mobile,
    },
  };
}

const roomNames = (slugs: string[]) => slugs.map((s) => EDIT_ROOMS.find((r) => r.slug === s)?.name ?? s).join(", ");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayText = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const timeText = (d: RoomRequestDetails) => `${dayText(d.date)}, ${timeLabel(toMinutes(d.start))} to ${timeLabel(toMinutes(d.end))}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What changed, in the words the email uses: "Rooms: John (MPH 1) → Luke
 * (MPH 2)". Empty when nothing did.
 */
export function describeChanges(before: RoomRequestDetails, after: RoomRequestDetails): string[] {
  const out: string[] = [];
  const line = (label: string, a: string, b: string) => {
    if (a !== b) out.push(`${label}: ${a || "none"} → ${b || "none"}`);
  };
  if (!same([...before.rooms].sort(), [...after.rooms].sort()))
    out.push(`${after.rooms.length > 1 ? "Rooms" : "Room"}: ${roomNames(before.rooms)} → ${roomNames(after.rooms)}`);
  line("When", timeText(before), timeText(after));
  line("Event", before.activity_name, after.activity_name);
  line("Ministry", before.organization, after.organization);
  line("People", String(before.participants), String(after.participants));
  line("Set-up", before.layout ? setupLabel(before.layout) : "", after.layout ? setupLabel(after.layout) : "");
  if (after.layout === "tables" && !same(before.tables, after.tables))
    line("Tables", tablesSummary(before.tables), tablesSummary(after.tables));
  if (!same(before.equipment, after.equipment)) line("Equipment", equipmentSummary(before.equipment), equipmentSummary(after.equipment));
  line("Food", before.food ? foodLabel(before.food) : "", after.food ? foodLabel(after.food) : "");
  line("Notes", before.purpose, after.purpose);
  line("Contact name", before.contact_name, after.contact_name);
  line("Contact email", before.contact_email, after.contact_email);
  line("Contact mobile", before.contact_mobile, after.contact_mobile);
  return out;
}

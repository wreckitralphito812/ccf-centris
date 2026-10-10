/**
 * The Dgroup registry (2026-10-08): leaders register their Dgroups, the
 * Centris team approves them, and only admins see the list. These are the
 * rules shared by the leader's form, the actions and the tests. The database
 * enforces the same limits (supabase/migrations/0018_dgroup_registry.sql).
 */

export const AUDIENCES = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "couples", label: "Couples" },
  { value: "singles", label: "Singles" },
  { value: "students", label: "Students" },
  { value: "young_professionals", label: "Young professionals" },
  { value: "families", label: "Families" },
  { value: "mixed", label: "Mixed" },
] as const;
export type Audience = (typeof AUDIENCES)[number]["value"];

export const FREQUENCIES = [
  { value: "weekly", label: "Every week" },
  { value: "every_other_week", label: "Every other week" },
  { value: "monthly", label: "Once a month" },
] as const;
export type Frequency = (typeof FREQUENCIES)[number]["value"];

export const WHERE = [
  { value: "centris", label: "At CCF Centris" },
  { value: "elsewhere", label: "Somewhere else" },
  { value: "online", label: "Online" },
] as const;
export type MeetsWhere = (typeof WHERE)[number]["value"];

/** Sunday is 0, matching dgroups.day_of_week and Date.getDay(). */
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const DGROUP_STATUS: Record<string, { label: string; tone: "clay" | "moss" | "sky" | "ink" }> = {
  pending: { label: "Waiting for approval", tone: "clay" },
  changes_requested: { label: "Changes needed", tone: "sky" },
  approved: { label: "Approved", tone: "moss" },
  declined: { label: "Not approved", tone: "ink" },
  archived: { label: "Stopped meeting", tone: "ink" },
};

export const labelOf = <T extends { value: string; label: string }>(list: readonly T[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? v ?? "";

export interface DgroupInput {
  name: string;
  audience: Audience;
  dayOfWeek: number;
  /** "HH:MM", 24-hour. */
  startTime: string;
  frequency: Frequency;
  meetsWhere: MeetsWhere;
  /** A general area for groups that meet elsewhere ("Katipunan"), never an address. */
  generalArea: string | null;
  currentSize: number;
  isOpen: boolean;
  leaderName: string;
  leaderMobile: string;
  coLeaderName: string | null;
  /** The leader's own Dgroup leader (upline), for the team to check with (2026-10-10). */
  uplineName: string;
  uplineMobile: string;
  description: string | null;
}

export type DgroupErrors = Partial<Record<"name" | "audience" | "day" | "time" | "frequency" | "where" | "area" | "size" | "leader" | "mobile" | "upline" | "uplineMobile" | "description", string>>;

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** "HH:MM" from a time field, or null. */
function hhmm(v: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? `${String(h).padStart(2, "0")}:${m[2]}` : null;
}

export function parseDgroup(fd: FormData): { ok: true; value: DgroupInput } | { ok: false; errors: DgroupErrors } {
  const errors: DgroupErrors = {};

  const name = text(fd.get("name")).replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 80) errors.name = "Give your Dgroup a name (3 to 80 characters).";

  const audience = text(fd.get("audience"));
  if (!AUDIENCES.some((a) => a.value === audience)) errors.audience = "Who is it for?";

  const day = Number(text(fd.get("day")));
  if (!text(fd.get("day")) || !Number.isInteger(day) || day < 0 || day > 6) errors.day = "Pick the day you meet.";

  const startTime = hhmm(text(fd.get("start_time")));
  if (!startTime) errors.time = "What time do you start?";

  const frequency = text(fd.get("frequency")) || "weekly";
  if (!FREQUENCIES.some((f) => f.value === frequency)) errors.frequency = "How often do you meet?";

  const meetsWhere = text(fd.get("meets_where"));
  if (!WHERE.some((w) => w.value === meetsWhere)) errors.where = "Where do you meet?";

  const area = text(fd.get("general_area"));
  if (meetsWhere === "elsewhere" && (area.length < 2 || area.length > 60)) {
    errors.area = "Name the general area, like Katipunan or Eastwood. Not an address.";
  }

  const size = Number(text(fd.get("current_size")));
  if (!Number.isInteger(size) || size < 1 || size > 30) errors.size = "How many are in the group now, including you? (1 to 30)";

  const leaderName = text(fd.get("leader_name")).replace(/\s+/g, " ");
  if (leaderName.length < 2 || leaderName.length > 120) errors.leader = "Your name, as the leader.";

  const leaderMobile = text(fd.get("leader_mobile"));
  if (!/^[+\d][\d\s-]{6,29}$/.test(leaderMobile)) errors.mobile = "A mobile number the team can reach you on.";

  const coLeader = text(fd.get("co_leader_name")).replace(/\s+/g, " ");

  // Every leader is led too: the team checks with their upline before
  // approving (Ralph, 2026-10-10).
  const uplineName = text(fd.get("upline_name")).replace(/\s+/g, " ");
  if (uplineName.length < 2 || uplineName.length > 120) errors.upline = "Your own Dgroup leader's name.";
  const uplineMobile = text(fd.get("upline_mobile"));
  if (!/^[+\d][\d\s-]{6,29}$/.test(uplineMobile)) errors.uplineMobile = "A mobile number for your Dgroup leader.";
  const description = text(fd.get("description"));
  if (description.length > 500) errors.description = "Keep it under 500 characters.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      audience: audience as Audience,
      dayOfWeek: day,
      startTime: startTime!,
      frequency: frequency as Frequency,
      meetsWhere: meetsWhere as MeetsWhere,
      generalArea: meetsWhere === "elsewhere" ? area : null,
      currentSize: size,
      isOpen: fd.get("is_open") === "1",
      leaderName,
      leaderMobile,
      coLeaderName: coLeader ? coLeader.slice(0, 120) : null,
      uplineName,
      uplineMobile,
      description: description || null,
    },
  };
}

/** "Wednesdays, 7:00 PM, every other week". */
export function scheduleText(d: { day_of_week: number | null; start_time: string | null; frequency?: string | null }): string {
  const day = d.day_of_week == null ? null : `${DAYS[d.day_of_week]}s`;
  let time: string | null = null;
  if (d.start_time) {
    const [h, m] = d.start_time.split(":").map(Number);
    time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }
  const often = d.frequency && d.frequency !== "weekly" ? labelOf(FREQUENCIES, d.frequency).toLowerCase() : null;
  return [day, time, often].filter(Boolean).join(", ");
}

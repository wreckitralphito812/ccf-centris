import { SITE } from "./site";

const TZ = SITE.timezone;

const time = new Intl.DateTimeFormat("en-PH", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dayLong = new Intl.DateTimeFormat("en-PH", {
  timeZone: TZ,
  weekday: "long",
  month: "long",
  day: "numeric",
});

const dateFull = new Intl.DateTimeFormat("en-PH", {
  timeZone: TZ,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const monthYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: TZ,
  month: "long",
  year: "numeric",
});

const weekday = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, weekday: "long" });

export const fmtTime = (v: string | Date) => time.format(new Date(v));
export const fmtDayShort = (v: string | Date) => dayShort.format(new Date(v));
export const fmtDayLong = (v: string | Date) => dayLong.format(new Date(v));
export const fmtDate = (v: string | Date) => dateFull.format(new Date(v));
export const fmtMonthYear = (v: string | Date) => monthYear.format(new Date(v));
export const fmtWeekday = (v: string | Date) => weekday.format(new Date(v));

export function fmtTimeRange(start: string | Date, end?: string | Date | null) {
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}

/** "1h 12m", for message durations. */
export function fmtDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function fmtPeso(cents: number): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const dayName = (n: number | null) => (n === null ? "" : DAYS[n] ?? "");

/** "in 3 days", "in 2 hours", "tomorrow". Coarse by design. */
export function fmtUntil(target: string | Date, now = new Date()): string {
  const ms = new Date(target).getTime() - now.getTime();
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return `in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/** YYYY-MM-DD in Manila, for date pickers and slot keys. */
export function manilaDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00+08:00`);
  d.setDate(d.getDate() + days);
  return manilaDateKey(d);
}

export const AUDIENCE_LABEL: Record<string, string> = {
  men: "Men",
  women: "Women",
  couples: "Couples",
  singles: "Singles",
  students: "Students",
  young_professionals: "Young professionals",
  families: "Families",
  mixed: "Everyone",
};

export const MODE_LABEL: Record<string, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

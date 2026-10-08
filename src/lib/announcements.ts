/**
 * Announcements for What's Happening (2026-10-05): the rules shared by the
 * submission form, the server actions and the tests. Spec:
 * docs/superpowers/specs/2026-10-05-announcements-design.md.
 */

/** The screen sizes ministries already make; Main Hall TV doubles as the web card. */
export const PLACEMENTS = [
  { key: "main_tv", label: "Main Hall TV", w: 1920, h: 1080, required: true, use: "The card on What's Happening" },
  { key: "social", label: "Social media", w: 1080, h: 1350, required: false, use: "The picture on phones" },
  { key: "gallery_tv", label: "Gallery TV", w: 1080, h: 1920, required: false, use: "Gallery TV screen" },
  { key: "led", label: "Main Hall LED", w: 4608, h: 1344, required: false, use: "Main Hall LED wall" },
  { key: "standee", label: "Standee", w: 500, h: 1000, required: false, use: "Standee" },
] as const;

export type PlacementKey = (typeof PLACEMENTS)[number]["key"];
export type Artwork = Partial<Record<PlacementKey, string>>;

export const placement = (key: string) => PLACEMENTS.find((p) => p.key === key) ?? null;

/** Adrian's two sections (2026-10-06). */
export const ANNOUNCEMENT_CATEGORIES = ["Events", "Trainings and classes"] as const;

export const VENUES = [
  "CCF Centris",
  "Main Hall",
  "Welcome Center",
  "Dgroup Lounge",
  "John (MPH 1)",
  "Luke (MPH 2)",
  "Matthew (MPH 3)",
  "Mark (MPH 4)",
  "Online",
] as const;

export const SUMMARY_MAX = 160;
export const DESCRIPTION_MAX = 1200;
export const MAX_DATES = 8;
export const MAX_UPLOAD_MB = 15;

/**
 * Does a picture fit its placement? The shape must match (within 3%); a
 * picture much smaller than the size it'll be shown at only gets a warning.
 */
export function shapeCheck(key: PlacementKey, w: number, h: number): { level: "ok" | "warn" | "error"; message: string } {
  const p = placement(key)!;
  const want = p.w / p.h;
  const got = w / h;
  if (Math.abs(got - want) / want > 0.03) {
    return {
      level: "error",
      message: `This picture is ${w} × ${h}. The ${p.label} file should be ${p.w} × ${p.h}.`,
    };
  }
  if (w < p.w * 0.6) {
    return { level: "warn", message: `Looks right, but small (${w} × ${h}). ${p.w} × ${p.h} will look sharper.` };
  }
  return { level: "ok", message: `${w} × ${h}` };
}

/** Uploaded artwork must come from our own Vercel Blob store. */
export const isOurUpload = (url: unknown): url is string =>
  typeof url === "string" && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"<>]+$/i.test(url);

const kebab = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

/** "family-camp-lite-2026-11-07-4f3a": readable, and unique with the id's start. */
export const slugFor = (title: string, date: string, id: string) =>
  [kebab(title) || "announcement", date, id.replace(/-/g, "").slice(0, 4)].join("-");

/** "2026-11-07 Family Camp Lite – Main Hall LED.jpg", for the media team's downloads. */
export function downloadName(title: string, date: string, key: PlacementKey, url: string): string {
  const ext = /\.(jpe?g|png|webp)(?:$|\?)/i.exec(url)?.[1]?.toLowerCase().replace("jpeg", "jpg") ?? "jpg";
  const clean = title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${date} ${clean} – ${placement(key)!.label}.${ext}`;
}

export interface AnnouncementDate {
  /** ISO. An all-day date runs from its first day's 00:00 to its last day's 23:59, Manila. */
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
}

export interface AnnouncementInput {
  title: string;
  ministry: string;
  category: (typeof ANNOUNCEMENT_CATEGORIES)[number];
  venue: string;
  summary: string;
  description: string | null;
  registrationUrl: string | null;
  feeNote: string | null;
  /** Soonest first. */
  dates: AnnouncementDate[];
  artwork: Artwork;
}

export type AnnouncementErrors = Partial<
  Record<"title" | "ministry" | "category" | "venue" | "summary" | "description" | "dates" | "registration" | "fee" | "artwork", string>
>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: FormDataEntryValue | null | undefined) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * Validate a submission. `today` is Manila "YYYY-MM-DD". Admins posting
 * directly can skip the artwork (calendar-only bookings have none).
 */
export function parseAnnouncement(
  fd: FormData,
  today: string,
  opts: { artworkRequired?: boolean; allowPast?: boolean } = {},
): { ok: true; value: AnnouncementInput } | { ok: false; errors: AnnouncementErrors } {
  const errors: AnnouncementErrors = {};

  const title = text(fd.get("title"));
  if (title.length < 3 || title.length > 80) errors.title = "Give it a title (up to 80 characters).";

  const ministry = text(fd.get("ministry"));
  if (ministry.length < 2 || ministry.length > 80) errors.ministry = "Which ministry is it from?";

  const category = text(fd.get("category"));
  if (!ANNOUNCEMENT_CATEGORIES.includes(category as never)) errors.category = "Pick a category.";

  const venuePick = text(fd.get("venue"));
  const venue = venuePick === "Other" ? text(fd.get("venue_other")) : venuePick;
  if (venuePick !== "Other" && !VENUES.includes(venuePick as never)) errors.venue = "Pick where it is.";
  else if (venue.length < 2 || venue.length > 80) errors.venue = "Type where it is.";

  const summary = text(fd.get("summary"));
  if (summary.length < 10 || summary.length > SUMMARY_MAX)
    errors.summary = `One sentence, between 10 and ${SUMMARY_MAX} characters.`;

  // Line breaks kept: it's shown as paragraphs.
  const description = String(fd.get("description") ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
  if (description && description.length > DESCRIPTION_MAX) errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`;

  // Dates: parallel fields, one row per date. A row is either timed (start,
  // optional end) or all-day, optionally running to a later "until" day.
  const days = fd.getAll("date").map(text);
  const starts = fd.getAll("start").map(text);
  const ends = fd.getAll("end").map(text);
  const allDay = fd.getAll("allday").map(text);
  const untils = fd.getAll("until").map(text);
  const dates: AnnouncementDate[] = [];
  if (!days.length || days.length > MAX_DATES) errors.dates = `Add between 1 and ${MAX_DATES} dates.`;
  days.forEach((d, i) => {
    if (errors.dates) return;
    if (!DATE.test(d)) return (errors.dates = "Each date needs a day.");
    // Admins edit series that are already under way (2026-10-08).
    if (d < today && !opts.allowPast) return (errors.dates = "One of the dates has already passed.");
    if (allDay[i] === "1") {
      const until = untils[i] || d;
      if (!DATE.test(until) || until < d) return (errors.dates = "The last day can't be before the first.");
      dates.push({
        startsAt: new Date(`${d}T00:00:00+08:00`).toISOString(),
        endsAt: new Date(`${until}T23:59:00+08:00`).toISOString(),
        allDay: true,
      });
      return;
    }
    const s = starts[i] ?? "";
    const e = ends[i] ?? "";
    if (!HHMM.test(s)) return (errors.dates = "Give each date a start time, or mark it all day.");
    if (e && !HHMM.test(e)) return (errors.dates = "Check the end times.");
    if (e && e <= s) return (errors.dates = "Each end time must be after its start time.");
    dates.push({
      startsAt: new Date(`${d}T${s}:00+08:00`).toISOString(),
      endsAt: e ? new Date(`${d}T${e}:00+08:00`).toISOString() : null,
      allDay: false,
    });
  });
  dates.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  let registrationUrl: string | null = null;
  if (text(fd.get("signup")) === "link") {
    const url = text(fd.get("registration_url"));
    if (!/^https?:\/\/\S+\.\S+/.test(url) || url.length > 300) errors.registration = "Paste the full sign-up link, starting with https://";
    else registrationUrl = url;
  }

  let feeNote: string | null = null;
  if (text(fd.get("fee")) === "paid") {
    feeNote = text(fd.get("fee_note"));
    if (feeNote.length < 2 || feeNote.length > 120) errors.fee = "Write the fee, e.g. ₱600 adults, ₱400 kids, free for 6 and below.";
  }

  const artwork: Artwork = {};
  for (const p of PLACEMENTS) {
    const url = text(fd.get(`artwork_${p.key}`));
    if (url && !isOurUpload(url)) errors.artwork = "One of the files didn't upload properly. Upload it again.";
    else if (url) artwork[p.key] = url;
  }
  if ((opts.artworkRequired ?? true) && !artwork.main_tv && !errors.artwork) errors.artwork = "The Main Hall TV picture is required.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      ministry,
      category: category as AnnouncementInput["category"],
      venue,
      summary,
      description,
      registrationUrl,
      feeNote,
      dates,
      artwork,
    },
  };
}

const MANILA = 8 * 3_600_000;
const manilaDate = (iso: string) => new Date(new Date(iso).getTime() + MANILA);
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso: string) => {
  const d = manilaDate(iso);
  return `${WD[d.getUTCDay()]}, ${MO[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
const timeOf = (iso: string) => {
  const d = manilaDate(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h === 12 && m === 0) return "12 NN";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/**
 * One date as people read it: "Sat, Nov 7, 8:00 AM – 5:00 PM",
 * "Sat, Oct 10, 3:30 PM onwards", "Fri, Oct 16 – Sun, Oct 18" or
 * "Sat, Oct 24 · All day".
 */
export function dateText(d: { starts_at: string; ends_at: string | null; all_day?: boolean }): string {
  if (d.all_day) {
    const first = dayLabel(d.starts_at);
    const last = d.ends_at ? dayLabel(d.ends_at) : first;
    return first === last ? `${first} · All day` : `${first} – ${last}`;
  }
  return d.ends_at
    ? `${dayLabel(d.starts_at)}, ${timeOf(d.starts_at)} – ${timeOf(d.ends_at)}`
    : `${dayLabel(d.starts_at)}, ${timeOf(d.starts_at)} onwards`;
}

/** Every Manila day a date covers (a multi-day all-day date covers several). */
export function daysCovered(d: { starts_at: string; ends_at: string | null; all_day?: boolean }): string[] {
  const first = manilaDate(d.starts_at).toISOString().slice(0, 10);
  if (!d.all_day || !d.ends_at) return [first];
  const last = manilaDate(d.ends_at).toISOString().slice(0, 10);
  const out: string[] = [];
  for (let t = Date.parse(`${first}T00:00:00Z`); out.length < 31; t += 86_400_000) {
    const k = new Date(t).toISOString().slice(0, 10);
    out.push(k);
    if (k >= last) break;
  }
  return out;
}

/** The last moment an announcement is relevant: when its last date ends. */
export const lastEnd = (dates: { startsAt: string; endsAt: string | null }[]) =>
  dates.reduce((m, d) => ((d.endsAt ?? d.startsAt) > m ? (d.endsAt ?? d.startsAt) : m), "");

/** A card's date line: the first date, plus how many more ("+ 2 more"). */
export function shortWhen(e: { starts_at: string; ends_at: string | null; dates?: { starts_at: string; ends_at: string | null; all_day?: boolean }[] }): string {
  const ds = e.dates?.length ? e.dates : [{ starts_at: e.starts_at, ends_at: e.ends_at }];
  const first = ds[0];
  const text = first.all_day
    ? dateText(first).replace(" · All day", "")
    : `${dayLabel(first.starts_at)} · ${timeOf(first.starts_at)}`;
  return ds.length > 1 ? `${text} + ${ds.length - 1} more` : text;
}

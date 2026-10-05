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

export const ANNOUNCEMENT_CATEGORIES = ["Church-wide events", "Trainings and classes"] as const;

export const VENUES = [
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

export interface AnnouncementInput {
  title: string;
  ministry: string;
  category: (typeof ANNOUNCEMENT_CATEGORIES)[number];
  venue: string;
  summary: string;
  registrationUrl: string | null;
  feeNote: string | null;
  /** Manila times as ISO strings, soonest first. */
  dates: { startsAt: string; endsAt: string }[];
  artwork: Artwork;
}

export type AnnouncementErrors = Partial<Record<"title" | "ministry" | "category" | "venue" | "summary" | "dates" | "registration" | "fee" | "artwork", string>>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: FormDataEntryValue | null | undefined) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Validate a submission. `today` is Manila "YYYY-MM-DD". */
export function parseAnnouncement(
  fd: FormData,
  today: string,
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

  // Dates: parallel date / start / end fields, one row per date.
  const days = fd.getAll("date").map(text);
  const starts = fd.getAll("start").map(text);
  const ends = fd.getAll("end").map(text);
  const dates: AnnouncementInput["dates"] = [];
  if (!days.length || days.length > MAX_DATES) errors.dates = `Add between 1 and ${MAX_DATES} dates.`;
  days.forEach((d, i) => {
    if (errors.dates) return;
    const s = starts[i] ?? "";
    const e = ends[i] ?? "";
    if (!DATE.test(d) || !HHMM.test(s) || !HHMM.test(e)) errors.dates = "Each date needs a day, a start and an end time.";
    else if (d < today) errors.dates = "One of the dates has already passed.";
    else if (e <= s) errors.dates = "Each end time must be after its start time.";
    else dates.push({ startsAt: new Date(`${d}T${s}:00+08:00`).toISOString(), endsAt: new Date(`${d}T${e}:00+08:00`).toISOString() });
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
  if (!artwork.main_tv && !errors.artwork) errors.artwork = "The Main Hall TV picture is required.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { title, ministry, category: category as AnnouncementInput["category"], venue, summary, registrationUrl, feeNote, dates, artwork },
  };
}

/** The last moment an announcement is relevant: when its last date ends. */
export const lastEnd = (dates: { startsAt: string; endsAt: string | null }[]) =>
  dates.reduce((m, d) => ((d.endsAt ?? d.startsAt) > m ? (d.endsAt ?? d.startsAt) : m), "");

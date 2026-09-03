import "server-only";

import { getCatalog, seriesSlug, type CatalogPlaylist } from "./channel";
import {
  getChannelUploads,
  getPlaylistVideos,
  getVideoDurations,
  hasYouTubeApi,
  maxResThumb,
  type ApiVideo,
} from "./youtube-api";
import {
  messages as seedMessages,
  series as seedSeries,
  speakers as seedSpeakers,
} from "@/data/teaching";
import type { FourWs, Message, Series, Speaker } from "./types";

/**
 * Real CCF teaching, derived live from the @CCFmainTV channel.
 *
 * CCF titles every Sunday sermon upload to one shape:
 *
 *   "<Title> | <Speaker> | <Month Day, Year>"
 *
 * Run over the channel's uploads feed, that single pattern yields the real
 * title, the real preacher, and the real preaching date for every Sunday
 * message CCF has published — no scraping and no invention. Series comes from
 * playlist membership rather than the title, since CCF does not put it there.
 *
 * Everything fails soft. Without an API key, past a spent quota, or if CCF
 * ever changes its title convention so nothing parses, callers fall back to
 * the captured seed in @/data/teaching and the site degrades to stale rather
 * than empty.
 */

/* -------------------------------------------------------------------------
   Parsing CCF's title convention
   ------------------------------------------------------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SERMON_TITLE = new RegExp(
  `^(?<title>.+?)\\s*\\|\\s*(?<speaker>[^|]+?)\\s*\\|\\s*` +
    `(?<date>(?:${MONTHS.join("|")})\\s+\\d{1,2},\\s+\\d{4})\\s*$`,
);

/**
 * Companion formats that share the sermon title shape but are not the Sunday
 * message: walkthroughs, condensed cuts, and the clip series.
 */
const COMPANION_SUFFIX = /\b(run\s*through|sunday fast track|fast track|snippets?)\b/i;

/** Language re-uploads of an earlier message, e.g. "(Tagalog) Live Wisely…". */
const LANGUAGE_PREFIX = /^\s*\((tagalog|chinese|cantonese|mandarin|indonesian|korean|japanese|bisaya|cebuano|ilonggo)\)/i;

/**
 * The middle field is a person for a Sunday message. These are the shapes CCF
 * uses there when it is *not* — conference days and numbered sessions.
 */
const NOT_A_SPEAKER =
  /\b(day\s*\d|session\s*\d|part\s*\d|prayer and fasting|anniversary|special|worship|midyear|mid-year)\b/i;

interface ParsedSermon {
  video: ApiVideo;
  title: string;
  speaker: string;
  /** Preaching date as YYYY-MM-DD, from the title, not the upload date. */
  preachedOn: string;
}

/** "August 30, 2026" -> "2026-08-30". Null if the date is not real. */
function isoFromTitleDate(text: string): string | null {
  const m = text.match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return null;

  const month = MONTHS.indexOf(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 0 || day < 1 || day > 31) return null;

  // Reject dates that rolled over, e.g. "February 31".
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Collapse runs of whitespace: CCF has published "Bong  Saquing". */
function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * A Sunday message, or null if this upload is something else. Applied to every
 * item in the uploads feed; the great majority are clips and return null.
 */
export function parseSermon(video: ApiVideo): ParsedSermon | null {
  const raw = tidy(video.title);
  if (LANGUAGE_PREFIX.test(raw)) return null;

  const m = SERMON_TITLE.exec(raw);
  if (!m?.groups) return null;

  const title = tidy(m.groups.title);
  const speaker = tidy(m.groups.speaker);
  const preachedOn = isoFromTitleDate(m.groups.date);
  if (!preachedOn) return null;

  // A companion edition, not the Sunday message itself.
  if (COMPANION_SUFFIX.test(title) || COMPANION_SUFFIX.test(speaker)) return null;

  // The middle field must plausibly be a person's name.
  if (!speaker || speaker.length > 40) return null;
  if (/\d/.test(speaker)) return null;
  if (NOT_A_SPEAKER.test(speaker)) return null;

  if (!title) return null;

  return { video, title, speaker, preachedOn };
}

/* -------------------------------------------------------------------------
   Speakers
   ------------------------------------------------------------------------- */

/**
 * Bios for CCF pastors who preach regularly. Names must match the channel's
 * spelling exactly; anyone absent still gets a speaker page built from their
 * name alone, so this map only ever adds detail.
 */
const SPEAKER_BIOS: Record<string, { role: string; bio: string }> = {
  "Peter Tan-Chi": {
    role: "Founder and Senior Pastor, CCF",
    bio: "Founded Christ's Commission Fellowship in 1984 with a burden for discipleship. Teaches regularly across CCF centers.",
  },
  "Peter Tan-Chi Jr.": {
    role: "Pastor, CCF",
    bio: "Serves on CCF's teaching team and preaches across the CCF congregations.",
  },
  "Paul Tan-Chi": {
    role: "Pastor, CCF",
    bio: "Teaches on marriage, family, and discipleship across CCF's ministries.",
  },
  "Bong Saquing": {
    role: "Pastor, CCF",
    bio: "Part of CCF's regular teaching team, preaching weekly Sunday messages.",
  },
  "Paul De Vera": {
    role: "Pastor, CCF",
    bio: "Serves on CCF's preaching team across the Sunday services.",
  },
  "Marty Ocaya": {
    role: "Pastor, CCF",
    bio: "Preaches regularly at CCF and serves in pastoral care.",
  },
  "Ricky Sarthou": {
    role: "Pastor, CCF",
    bio: "Serves on CCF's teaching team.",
  },
  "Edric Mendoza": {
    role: "Pastor, CCF",
    bio: "Teaches at CCF with a focus on family and discipleship.",
  },
  "Leo Mata": {
    role: "Pastor, CCF",
    bio: "Serves on CCF's preaching team.",
  },
  "JP Masakayan": {
    role: "Pastor, CCF",
    bio: "Serves on CCF's teaching team.",
  },
};

/**
 * When two people preached the same message on one Sunday, this is the order
 * we pick the one whose recording represents it. Anyone unlisted sorts after.
 */
const SPEAKER_PRECEDENCE = [
  "Peter Tan-Chi",
  "Peter Tan-Chi Jr.",
  "Paul Tan-Chi",
  "Bong Saquing",
  "Paul De Vera",
  "Marty Ocaya",
  "Ricky Sarthou",
];

/** Slug that keeps suffixes distinct: "Peter Tan-Chi Jr." is not his father. */
export function speakerSlug(name: string): string {
  return tidy(name)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toSpeaker(name: string): Speaker {
  const slug = speakerSlug(name);
  const known = SPEAKER_BIOS[name];
  return {
    id: `spk-${slug}`,
    slug,
    name,
    role_title: known?.role ?? null,
    bio: known?.bio ?? null,
    photo_url: null,
  };
}

/* -------------------------------------------------------------------------
   Scripture, topics
   ------------------------------------------------------------------------- */

const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
  "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
  "Psalm", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
  "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
  "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const SCRIPTURE = new RegExp(
  `\\b(${BIBLE_BOOKS.map((b) => b.replace(/ /g, "\\s+")).join("|")})` +
    `\\.?\\s+\\d{1,3}(?::\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?)?`,
  "g",
);

/**
 * The first scripture reference in a video description, or null.
 *
 * CCF does not reliably put a passage in its descriptions, so this finds one
 * often enough to be worth showing and never guesses when it cannot. Callers
 * hide the passage panel rather than printing a placeholder.
 */
export function parseScripture(description: string): string | null {
  SCRIPTURE.lastIndex = 0;
  const m = SCRIPTURE.exec(description);
  return m ? tidy(m[0]).replace(/\.$/, "") : null;
}

/** Every distinct book named in a description, for the archive's book filter. */
export function parseBooks(description: string): string[] {
  const found = new Set<string>();
  SCRIPTURE.lastIndex = 0;
  for (const m of description.matchAll(SCRIPTURE)) {
    const book = tidy(m[1]).replace(/\.$/, "");
    found.add(book === "Psalm" ? "Psalms" : book);
  }
  return [...found];
}

const TOPIC_STOPWORDS = new Set([
  "ccf", "ccfmain", "ccfmaintv", "shorts", "short", "sermon", "preaching",
  "church", "god", "jesus", "bible", "sunday", "sundayservice", "christian",
  "christianity", "worship", "message", "fyp", "viral", "reels",
]);

/** Hashtags from a description, minus CCF's channel-wide boilerplate. */
export function parseTopics(description: string, limit = 6): string[] {
  const out: string[] = [];
  for (const m of description.matchAll(/#([A-Za-z][A-Za-z0-9_]{2,30})/g)) {
    const tag = m[1].toLowerCase();
    if (TOPIC_STOPWORDS.has(tag)) continue;
    // Split CCF's occasional camelCase tags into readable words.
    const label = m[1]
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase();
    if (!out.includes(label)) out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

/* -------------------------------------------------------------------------
   Series attribution
   ------------------------------------------------------------------------- */

/** Key for matching a sermon to its companion recording across playlists. */
function matchKey(title: string, speaker: string): string {
  const norm = (s: string) =>
    s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return `${norm(title)}::${norm(speaker)}`;
}

interface SeriesIndex {
  /** videoId -> series name, from the series' own playlists. */
  byVideo: Map<string, string>;
  /** title+speaker -> series name, from companion (Run Through) playlists. */
  byTitleSpeaker: Map<string, string>;
  /** series name -> the playlist it came from, for artwork. */
  playlist: Map<string, CatalogPlaylist>;
}

/**
 * Where each video belongs, built from CCF's playlists.
 *
 * The direct videoId map is authoritative. The title+speaker map exists for a
 * series CCF has started but not yet given a "Sunday Message" playlist — the
 * current one is usually in that state, with only a Run Through playlist —
 * and its Run Through entries carry the same title and speaker as the sermon.
 */
async function buildSeriesIndex(): Promise<SeriesIndex> {
  const byVideo = new Map<string, string>();
  const byTitleSpeaker = new Map<string, string>();
  const playlist = new Map<string, CatalogPlaylist>();

  const catalog = await getCatalog();

  const primary = catalog.filter(
    (p) => (p.kind === "series" || p.kind === "special") && p.series,
  );
  const companions = catalog.filter(
    (p) => p.kind === "run_through" && p.series,
  );

  for (const p of primary) {
    if (!playlist.has(p.series)) playlist.set(p.series, p);
    for (const v of await getPlaylistVideos(p.id, 50)) {
      if (!byVideo.has(v.id)) byVideo.set(v.id, p.series);
    }
  }

  for (const p of companions) {
    if (!playlist.has(p.series)) playlist.set(p.series, p);
    for (const v of await getPlaylistVideos(p.id, 50)) {
      // Companion titles read "<Title> | <Speaker> | Run Through".
      const parts = tidy(v.title).split("|").map(tidy);
      if (parts.length < 2) continue;
      const key = matchKey(parts[0], parts[1]);
      if (!byTitleSpeaker.has(key)) byTitleSpeaker.set(key, p.series);
    }
  }

  return { byVideo, byTitleSpeaker, playlist };
}

/* -------------------------------------------------------------------------
   Assembly
   ------------------------------------------------------------------------- */

function fourWsFor(m: Message): FourWs | null {
  // Without a passage there is nothing concrete to build a guide around, so
  // the section is omitted rather than filled with a placeholder.
  if (!m.scripture) return null;

  return {
    id: `4ws-${m.id}`,
    message_id: m.id,
    title: `${m.title} — 4Ws`,
    week_of: m.preached_on,
    welcome_md:
      "Share one place this week where you felt genuinely at ease, and one where you did not.",
    worship_md: `Read ${m.scripture} aloud together. Pause after it. Let someone pray before you discuss.`,
    word_md: [
      `1. What stood out to you in ${m.scripture}?`,
      "2. Where does this passage press against how you actually live?",
      "3. What would change this week if you took it seriously?",
    ].join("\n"),
    works_md:
      "Name one specific step before you leave. Ask someone in the group to check on you on Wednesday.",
    pdf_url: null,
  };
}

/** Kebab-case slug from a message title. */
function titleSlug(title: string): string {
  return tidy(title)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}

export interface LiveTeaching {
  messages: Message[];
  series: Series[];
  speakers: Speaker[];
  /** False when this is the captured seed rather than live channel data. */
  live: boolean;
}

async function buildLiveTeaching(): Promise<LiveTeaching> {
  const uploads = await getChannelUploads(8);
  if (!uploads.length) return seedTeaching();

  const parsed = uploads
    .map(parseSermon)
    .filter((p): p is ParsedSermon => p !== null);

  if (!parsed.length) return seedTeaching();

  // One Sunday message may have two recordings, one per preacher. Group them
  // so the archive shows the message once, crediting each preacher.
  const groups = new Map<string, ParsedSermon[]>();
  for (const p of parsed) {
    const key = `${matchKey(p.title, "")}${p.preachedOn}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  const index = await buildSeriesIndex();

  const durations = await getVideoDurations(
    [...groups.values()].map((g) => g[0].video.id).slice(0, 50),
  );

  const seriesByName = new Map<string, Series>();
  const speakersByName = new Map<string, Speaker>();
  const usedSlugs = new Set<string>();
  const built: Message[] = [];

  const ordered = [...groups.values()].sort((a, b) =>
    b[0].preachedOn.localeCompare(a[0].preachedOn),
  );

  for (const group of ordered) {
    const sorted = [...group].sort((a, b) => {
      const ia = SPEAKER_PRECEDENCE.indexOf(a.speaker);
      const ib = SPEAKER_PRECEDENCE.indexOf(b.speaker);
      const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      if (ra !== rb) return ra - rb;
      return a.video.publishedAt.localeCompare(b.video.publishedAt);
    });

    const lead = sorted[0];

    // Series: the sermon's own playlist first, then a companion match.
    const seriesName =
      index.byVideo.get(lead.video.id) ??
      sorted
        .map((s) => index.byTitleSpeaker.get(matchKey(s.title, s.speaker)))
        .find(Boolean) ??
      null;

    let series: Series | null = null;
    if (seriesName) {
      const existing = seriesByName.get(seriesName);
      if (existing) {
        series = existing;
      } else {
        const pl = index.playlist.get(seriesName);
        series = {
          id: `ser-${seriesSlug(seriesName)}`,
          slug: seriesSlug(seriesName),
          title: seriesName,
          subtitle: null,
          description: pl?.description || null,
          artwork_url: pl?.thumbnail || null,
          starts_on: null,
          ends_on: null,
        };
        seriesByName.set(seriesName, series);
      }
    }

    for (const s of sorted) {
      if (!speakersByName.has(s.speaker)) {
        speakersByName.set(s.speaker, toSpeaker(s.speaker));
      }
    }
    const speaker = speakersByName.get(lead.speaker) ?? null;

    let slug = titleSlug(lead.title);
    if (usedSlugs.has(slug)) slug = `${slug}-${lead.preachedOn}`;
    usedSlugs.add(slug);

    const description = lead.video.description ?? "";
    const id = `msg-${lead.video.id}`;

    const message: Message = {
      id,
      slug,
      title: lead.title,
      // CCF descriptions are long boilerplate blocks rather than a summary,
      // so the card and detail copy stay with the title instead of quoting
      // the first paragraph of a service announcement.
      description: null,
      scripture: parseScripture(description),
      preached_on: lead.preachedOn,
      duration_seconds: durations.get(lead.video.id) ?? null,
      thumbnail_url: lead.video.thumbnail || maxResThumb(lead.video.id),
      full_video_key: lead.video.id,
      sermon_video_key: lead.video.id,
      audio_url: null,
      transcript: null,
      notes_md: null,
      topics: parseTopics(description),
      bible_books: parseBooks(description),
      series,
      speaker,
      four_ws: null,
      also_preached_by: sorted.slice(1).map((s) => ({
        speaker: speakersByName.get(s.speaker) ?? toSpeaker(s.speaker),
        video_key: s.video.id,
      })),
    };

    message.four_ws = fourWsFor(message);
    built.push(message);
  }

  // Series run from their first message to their last.
  for (const s of seriesByName.values()) {
    const dates = built
      .filter((m) => m.series?.slug === s.slug)
      .map((m) => m.preached_on)
      .sort();
    s.starts_on = dates[0] ?? null;
    s.ends_on = dates[dates.length - 1] ?? null;
  }

  const orderedSeries = [...seriesByName.values()].sort((a, b) =>
    (b.ends_on ?? "").localeCompare(a.ends_on ?? ""),
  );
  const orderedSpeakers = [...speakersByName.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    messages: built,
    series: orderedSeries,
    speakers: orderedSpeakers,
    live: true,
  };
}

/** The captured snapshot, used whenever the channel cannot be read. */
function seedTeaching(): LiveTeaching {
  return {
    messages: seedMessages,
    series: seedSeries,
    speakers: seedSpeakers,
    live: false,
  };
}

/**
 * The teaching catalogue. Cached by the fetch layer underneath, so repeated
 * calls within a render pass — and across requests inside the revalidate
 * window — cost nothing.
 */
export async function getTeaching(): Promise<LiveTeaching> {
  if (!hasYouTubeApi) return seedTeaching();
  try {
    return await buildLiveTeaching();
  } catch (err) {
    console.warn("[teaching] live build failed, using seed:", err);
    return seedTeaching();
  }
}

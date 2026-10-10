/**
 * Site search's matching rules and its list of pages (2026-10-10). Search
 * used to cover only events and facilities, so "parking", "prayer" and
 * "Romans" found nothing although the site answers all three. `globalSearch`
 * in queries.ts now also searches these pages, the 4Ws guides and the Sunday
 * archive, with the rules below.
 */

import { PARKING, SERVICE_TIMES_TEXT } from "./site";

export type SearchKind = "Page" | "Event" | "4Ws guide" | "Sunday service" | "Series" | "Facility";

/** Kinds in the order results are grouped on the page. */
export const KIND_ORDER: SearchKind[] = ["Page", "Event", "4Ws guide", "Sunday service", "Series", "Facility"];

export interface SearchHit {
  kind: SearchKind;
  title: string;
  excerpt: string;
  href: string;
  /** Opens in a new tab (YouTube playlists). */
  external?: boolean;
}

export interface SearchablePage {
  title: string;
  href: string;
  excerpt: string;
  /** Words people search for that the title and excerpt don't say. */
  keywords: string;
}

/** The pages people look for, with the words they look for them by. */
export const PAGES: SearchablePage[] = [
  {
    title: "Visit",
    href: "/visit",
    excerpt: `Where we are, service times (Sundays at ${SERVICE_TIMES_TEXT}), and how to get here by car or train.`,
    keywords: "address location map directions getting here first time new here plan your visit sunday service times schedule worship",
  },
  {
    title: "Where to park",
    href: "/visit#getting-here",
    excerpt: `Park at ${PARKING.name}, with Waze and Google Maps directions to the parking.`,
    keywords: "parking park car drive driving waze google maps drop-off grab taxi",
  },
  {
    title: "Getting here by train",
    href: "/visit#getting-here",
    excerpt: "Take MRT-3 to Quezon Avenue station, then walk to Centris Station.",
    keywords: "mrt mrt-3 train lrt commute quezon avenue station walk public transport jeep bus",
  },
  {
    title: "Watch last Sunday",
    href: "/watch",
    excerpt: "Last Sunday's message, with this week's 4Ws guide to study it in your Dgroup.",
    keywords: "watch sermon message preaching video livestream live stream online replay last sunday",
  },
  {
    title: "4Ws guides",
    href: "/watch/4ws",
    excerpt: "Weekly discussion guides for Dgroups: Welcome, Worship, Word, Works.",
    keywords: "4ws four ws discussion guide dgroup study questions bible study",
  },
  {
    title: "Sunday archive",
    href: "/watch/archive",
    excerpt: "Past Sunday services and every series CCF has taught.",
    keywords: "archive past services sermons messages series playlists youtube",
  },
  {
    title: "Connect",
    href: "/connect",
    excerpt: "Join a Dgroup, sign up to serve, and follow CCF Centris.",
    keywords: "volunteer serve goserve ministry team join get involved small group community",
  },
  {
    title: "Join a Dgroup",
    href: "/grow/join-a-dgroup",
    excerpt: "What a Dgroup is, what happens at one, and how to join one.",
    keywords: "dgroup d-group discipleship small group join find lead leader",
  },
  {
    title: "Reserve a Dgroup table",
    href: "/reserve/dgroup",
    excerpt: "Book a table for your Dgroup in the Dgroup Lounge or the Welcome Center, Monday to Friday.",
    keywords: "book booking reserve reservation table lounge dgroup meet weekday",
  },
  {
    title: "Request a room",
    href: "/centris/reserve",
    excerpt: "Request a ministry room for a meeting, training or event.",
    keywords: "book booking reserve reservation room hall venue ministry meeting event space",
  },
  {
    title: "Reserve",
    href: "/reserve",
    excerpt: "Book a table for your Dgroup or request a room for a ministry gathering.",
    keywords: "book booking reserve reservation",
  },
  {
    title: "Prayer Wall",
    href: "/prayer-wall",
    excerpt: "Post a prayer request and pray for others in the CCF Centris community.",
    keywords: "prayer pray prayers request intercede intercession",
  },
  {
    title: "What's Happening",
    href: "/events",
    excerpt: "Retreats, conferences and other events at CCF Centris.",
    keywords: "events happenings upcoming whats on conference retreat",
  },
  {
    title: "Calendar",
    href: "/events/calendar",
    excerpt: "Sunday services and events for the month.",
    keywords: "calendar month schedule dates",
  },
  {
    title: "Post an announcement",
    href: "/announce",
    excerpt: "For ministry reps: send your event to What's Happening and the screens at CCF Centris.",
    keywords: "announce announcement promote event ministry rep screens",
  },
  {
    title: "The center",
    href: "/centris",
    excerpt: "The worship hall, sports hall, multipurpose halls, NXTGEN rooms and Dgroup lounge on one floor.",
    keywords: "facilities rooms floor plan nxtgen kids children sports hall court worship hall",
  },
  {
    title: "Give",
    href: "/give",
    excerpt: "Give your tithes and offerings through CCF's secure giving form.",
    keywords: "give giving tithe tithes offering offerings donate donation donations pledge bank card gcash",
  },
  {
    title: "Contact",
    href: "/contact",
    excerpt: "Send us a message, or find our address and office hours.",
    keywords: "contact email phone call message ask question office hours help",
  },
  {
    title: "Who we are",
    href: "/about",
    excerpt: "Part of Christ's Commission Fellowship: our mission, vision, core values and statement of faith.",
    keywords: "about ccf christs commission fellowship mission vision values beliefs statement of faith church",
  },
  {
    title: "Privacy",
    href: "/privacy",
    excerpt: "What we collect, why, and how to ask us to remove it.",
    keywords: "privacy data personal information policy",
  },
];

/** Little words that would make every page match ("where to park"). */
const STOP = new Set(["a", "an", "and", "are", "at", "can", "do", "for", "how", "i", "in", "is", "it", "my", "of", "on", "the", "to", "what", "when", "where", "who", "with"]);

/**
 * Lowercase, straight quotes, no accents, no hyphen inside a word: "What’s"
 * and "whats" match, and so do "Tan-Chi" and "Tanchi", "D-group" and "Dgroup".
 */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[’‘']/g, "")
    .replace(/(\p{L})-(?=\p{L})/gu, "$1");

/** The words of a query worth matching, stop words dropped (unless that's all there is). */
export function queryTerms(q: string): string[] {
  const words = fold(q).split(/[^\p{L}\p{N}:-]+/u).filter(Boolean);
  const kept = words.filter((w) => !STOP.has(w));
  return kept.length ? kept : words;
}

/** "parking" also finds "park", "prayers" finds "prayer". */
function stems(term: string): string[] {
  const out = [term];
  if (term.length > 5 && term.endsWith("ing")) out.push(term.slice(0, -3));
  if (term.length > 4 && term.endsWith("es")) out.push(term.slice(0, -2));
  if (term.length > 3 && term.endsWith("s")) out.push(term.slice(0, -1));
  return out;
}

/**
 * How well a record matches: 0 when any term is missing, higher when the
 * title carries the terms. Every term must appear somewhere.
 */
export function matchScore(terms: string[], title: string, ...rest: (string | null | undefined)[]): number {
  if (!terms.length) return 0;
  const t = fold(title);
  const hay = `${t} ${fold(rest.filter(Boolean).join(" "))}`;
  let score = 1;
  for (const term of terms) {
    const forms = stems(term);
    if (!forms.some((f) => hay.includes(f))) return 0;
    if (forms.some((f) => t.includes(f))) score += 2;
  }
  return score;
}

/** Every bit of text in a nested record (a 4Ws guide's sections), for searching. */
export function allText(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) allText(x, out);
  else if (v && typeof v === "object") for (const x of Object.values(v)) allText(x, out);
  return out;
}

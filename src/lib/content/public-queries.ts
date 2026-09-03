/**
 * Read-side queries over the committed content snapshot. Kept free of the
 * `server-only` marker so the test runner and build scripts can exercise them;
 * `src/lib/queries.ts` re-exports these for pages.
 *
 * Every query falls back to `null`/`[]` gracefully when its section is empty,
 * so a not-yet-synced environment still renders (pages layer their own seed
 * fallback on top where one exists).
 */

import { manilaDateKey } from "../format";
import { readSnapshot } from "./snapshot";
import type {
  ChronicleIssueRecord,
  FourWsGuideRecord,
  FourWsWeekRecord,
  GlcCategory,
  GlcClassRecord,
  IntercedeRecord,
  ResourceRecord,
  ScriptureMemoryRecord,
} from "./types";

// --- Resources ----------------------------------------------------------

export interface ResourceFilters {
  q?: string;
  format?: string;
  language?: string;
  audience?: string;
}

export function findResources(f: ResourceFilters = {}): Promise<ResourceRecord[]> {
  const needle = f.q?.trim().toLowerCase();
  const rows = readSnapshot().resources.filter((r) => {
    if (f.format && r.format !== f.format) return false;
    if (f.language && r.language !== f.language) return false;
    if (f.audience && r.audience !== f.audience) return false;
    if (needle) {
      const hay = `${r.title} ${r.description ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  return Promise.resolve(rows);
}

export function getResourceFacets(): Promise<{
  formats: string[];
  languages: string[];
  audiences: string[];
}> {
  const rows = readSnapshot().resources;
  const uniq = (xs: (string | null)[]) =>
    [...new Set(xs.filter((x): x is string => Boolean(x)))].sort();
  return Promise.resolve({
    formats: uniq(rows.map((r) => r.format)),
    languages: uniq(rows.map((r) => r.language)),
    audiences: uniq(rows.map((r) => r.audience)),
  });
}

// --- Chronicle --------------------------------------------------------

export function getChronicleIssues(series?: string): Promise<ChronicleIssueRecord[]> {
  let rows = readSnapshot().chronicleIssues;
  if (series) rows = rows.filter((i) => i.seriesTitle === series);
  return Promise.resolve(rows);
}

export interface ChronicleGroup {
  series: string;
  issues: ChronicleIssueRecord[];
}

export async function getChronicleGroups(): Promise<ChronicleGroup[]> {
  const rows = await getChronicleIssues();
  const order: string[] = [];
  const bySeries = new Map<string, ChronicleIssueRecord[]>();
  for (const issue of rows) {
    const key = issue.seriesTitle ?? "Other";
    if (!bySeries.has(key)) {
      bySeries.set(key, []);
      order.push(key);
    }
    bySeries.get(key)!.push(issue);
  }
  return order.map((series) => ({ series, issues: bySeries.get(series)! }));
}

// --- 52-Week Scripture ----------------------------------------------

export function getScriptureMemory(year?: number): Promise<ScriptureMemoryRecord[]> {
  let rows = [...readSnapshot().scriptureMemory];
  rows.sort((a, b) => b.year - a.year || b.week - a.week);
  if (year) rows = rows.filter((w) => w.year === year);
  return Promise.resolve(rows);
}

export function getScriptureYears(): Promise<number[]> {
  const years = new Set(readSnapshot().scriptureMemory.map((w) => w.year));
  return Promise.resolve([...years].sort((a, b) => b - a));
}

/** The most recent week overall, for the "this week" slot. */
export async function getCurrentScriptureMemory(): Promise<ScriptureMemoryRecord | null> {
  const rows = await getScriptureMemory();
  return rows[0] ?? null;
}

// --- Intercede ----------------------------------------------------

export interface IntercedeView {
  campaign: IntercedeRecord;
  archived: boolean;
}

export function getCurrentIntercede(today = manilaDateKey()): Promise<IntercedeView | null> {
  const campaign = readSnapshot().intercede[0];
  if (!campaign) return Promise.resolve(null);
  const archived = campaign.endDate ? campaign.endDate < today : false;
  return Promise.resolve({ campaign, archived });
}

// --- GLC catalogue ------------------------------------------------

export function getGlcCatalogue(category?: GlcCategory): Promise<GlcClassRecord[]> {
  let rows = [...readSnapshot().glcClasses].filter((c) => c.active);
  rows.sort((a, b) => a.sortOrder - b.sortOrder);
  if (category) rows = rows.filter((c) => c.category === category);
  return Promise.resolve(rows);
}

export interface GlcCategoryGroup {
  category: GlcCategory;
  classes: GlcClassRecord[];
}

export async function getGlcCatalogueGroups(): Promise<GlcCategoryGroup[]> {
  const rows = await getGlcCatalogue();
  const order: GlcCategory[] = [];
  const byCategory = new Map<GlcCategory, GlcClassRecord[]>();
  for (const cls of rows) {
    if (!byCategory.has(cls.category)) {
      byCategory.set(cls.category, []);
      order.push(cls.category);
    }
    byCategory.get(cls.category)!.push(cls);
  }
  return order.map((category) => ({ category, classes: byCategory.get(category)! }));
}

// --- 4Ws --------------------------------------------------------------

/** ISO 8601 week number for a "YYYY-MM-DD" date. */
function isoWeek(dateIso: string): number | null {
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 864e5));
}

/** "2026-08-29" + label "Aug 29 and 30" -> "Aug 29–30, 2026". */
function spanLabel(week: FourWsWeekRecord): string | null {
  if (!week.serviceDate) return week.serviceDateLabel;
  const year = week.serviceDate.slice(0, 4);
  if (week.serviceDateLabel) {
    // "Aug 29 and 30" -> "Aug 29–30"
    const tidy = week.serviceDateLabel
      .replace(/\s*&\s*|\s+and\s+/i, "–")
      .replace(/\s*-\s*/, "–");
    return `${tidy}, ${year}`;
  }
  return new Date(`${week.serviceDate}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export interface FourWsWeekView extends FourWsWeekRecord {
  weekNumber: number | null;
  /** Human span, e.g. "Aug 29–30, 2026". */
  dateSpan: string | null;
  hasGuide: boolean;
}

function decorateWeek(
  week: FourWsWeekRecord,
  guideSlugs: Set<string>,
): FourWsWeekView {
  return {
    ...week,
    weekNumber: week.serviceDate ? isoWeek(week.serviceDate) : null,
    dateSpan: spanLabel(week),
    hasGuide: guideSlugs.has(week.slug),
  };
}

export function getFourWsWeeks(): Promise<FourWsWeekView[]> {
  const snap = readSnapshot();
  const guideSlugs = new Set(snap.fourWsGuides.map((g) => g.slug));
  return Promise.resolve(snap.fourWsWeeks.map((w) => decorateWeek(w, guideSlugs)));
}

/** The most recent 4Ws week — the "this week" slot. */
export async function getCurrentFourWs(): Promise<FourWsWeekView | null> {
  const weeks = await getFourWsWeeks();
  return weeks[0] ?? null;
}

export function getFourWsGuide(slug: string): Promise<FourWsGuideRecord | null> {
  const guide = readSnapshot().fourWsGuides.find((g) => g.slug === slug);
  return Promise.resolve(guide ?? null);
}

export interface FourWsCurrent {
  week: FourWsWeekView;
  guide: FourWsGuideRecord | null;
}

/** The current week paired with its full guide, for the homepage rail. */
export async function getCurrentFourWsGuide(): Promise<FourWsCurrent | null> {
  const week = await getCurrentFourWs();
  if (!week) return null;
  const guide = await getFourWsGuide(week.slug);
  return { week, guide };
}

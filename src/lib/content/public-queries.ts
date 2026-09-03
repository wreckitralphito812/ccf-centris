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

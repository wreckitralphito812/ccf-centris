/**
 * The committed content snapshot: one JSON file that holds every synchronized
 * CCF section plus per-section provenance. There is no database. The sync job
 * rewrites sections here atomically; `src/lib/queries.ts` reads them.
 *
 * This module is plain filesystem code so it can run under the test runner and
 * build scripts. The server-only boundary lives in `queries.ts`.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type {
  ChronicleIssueRecord,
  FourWsGuideRecord,
  FourWsWeekRecord,
  GlcClassRecord,
  IntercedeRecord,
  ResourceRecord,
  ScriptureMemoryRecord,
} from "./types";

export const SNAPSHOT_PATH = join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "public-content.json",
);

export interface SectionMeta {
  lastRunAt: string;
  checksum: string;
  parserVersion: string;
  warnings: string[];
}

export interface ContentSnapshot {
  resources: ResourceRecord[];
  scriptureMemory: ScriptureMemoryRecord[];
  chronicleIssues: ChronicleIssueRecord[];
  intercede: IntercedeRecord[];
  glcClasses: GlcClassRecord[];
  fourWsWeeks: FourWsWeekRecord[];
  fourWsGuides: FourWsGuideRecord[];
  meta: Partial<Record<SnapshotSection, SectionMeta>>;
}

export type SnapshotSection = Exclude<keyof ContentSnapshot, "meta">;

export const SNAPSHOT_SECTIONS: SnapshotSection[] = [
  "resources",
  "scriptureMemory",
  "chronicleIssues",
  "intercede",
  "glcClasses",
  "fourWsWeeks",
  "fourWsGuides",
];

export function emptySnapshot(): ContentSnapshot {
  return {
    resources: [],
    scriptureMemory: [],
    chronicleIssues: [],
    intercede: [],
    glcClasses: [],
    fourWsWeeks: [],
    fourWsGuides: [],
    meta: {},
  };
}

/** Read the snapshot at `path`, or an empty shaped snapshot if it is absent. */
export function readSnapshotFrom(path: string): ContentSnapshot {
  if (!existsSync(path)) return emptySnapshot();
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ContentSnapshot>;
  const base = emptySnapshot();
  for (const section of SNAPSHOT_SECTIONS) {
    if (Array.isArray(parsed[section])) {
      (base[section] as unknown[]) = parsed[section] as unknown[];
    }
  }
  if (parsed.meta && typeof parsed.meta === "object") base.meta = parsed.meta;
  return base;
}

export function readSnapshot(): ContentSnapshot {
  return readSnapshotFrom(SNAPSHOT_PATH);
}

/** Deterministic key-sorted JSON so re-runs produce byte-identical files. */
function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, sortedReplacer(), 2)}\n`;
}

function sortedReplacer() {
  return function (this: unknown, _key: string, val: unknown) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      );
    }
    return val;
  };
}

/** Write atomically: temp file in the same directory, then rename over target. */
export function writeSnapshotTo(path: string, next: ContentSnapshot): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.public-content.${process.pid}.tmp`);
  writeFileSync(tmp, stableStringify(next), "utf8");
  renameSync(tmp, path);
}

export function writeSnapshot(next: ContentSnapshot): void {
  writeSnapshotTo(SNAPSHOT_PATH, next);
}

/** Return a new snapshot with one section and its meta replaced. */
export function replaceSection<K extends SnapshotSection>(
  snap: ContentSnapshot,
  key: K,
  records: ContentSnapshot[K],
  meta: SectionMeta,
): ContentSnapshot {
  return {
    ...snap,
    [key]: records,
    meta: { ...snap.meta, [key]: meta },
  };
}

// --- Validation -----------------------------------------------------------

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const KNOWN_GLC_CATEGORIES = new Set([
  "GLC 1 EDIFY",
  "GLC 2 EQUIP",
  "GLC 3 EMPOW",
  "Apologetics",
  "Biblical Foundations",
  "Book Studies",
  "Discipleship",
  "Engage",
  "Evangelism",
  "Leadership",
  "Theology and Bible",
]);

const VALIDATORS: Record<SnapshotSection, (records: unknown[]) => string[]> = {
  resources: (records) =>
    records.flatMap((r, i) =>
      (r as ResourceRecord).slug ? [] : [`resources[${i}] has no slug identity`],
    ),
  scriptureMemory: (records) =>
    records.flatMap((r, i) => {
      const rec = r as ScriptureMemoryRecord;
      const errs: string[] = [];
      if (!Number.isInteger(rec.year)) errs.push(`scriptureMemory[${i}] year is not an integer`);
      if (!Number.isInteger(rec.week)) errs.push(`scriptureMemory[${i}] week is not an integer`);
      if (!rec.reference) errs.push(`scriptureMemory[${i}] has no reference`);
      return errs;
    }),
  chronicleIssues: (records) =>
    records.flatMap((r, i) => {
      const rec = r as ChronicleIssueRecord;
      const errs: string[] = [];
      if (!rec.downloadId) errs.push(`chronicleIssues[${i}] has no downloadId identity`);
      if (!/\/download\/\d+/.test(rec.downloadUrl ?? "")) {
        errs.push(`chronicleIssues[${i}] downloadUrl is not a /download/{id}/ URL`);
      }
      return errs;
    }),
  intercede: (records) =>
    records.flatMap((r, i) =>
      (r as IntercedeRecord).campaignTitle ? [] : [`intercede[${i}] has no campaignTitle`],
    ),
  glcClasses: (records) =>
    records.flatMap((r, i) => {
      const rec = r as GlcClassRecord;
      const errs: string[] = [];
      if (!rec.trackKey) errs.push(`glcClasses[${i}] has no trackKey identity`);
      if (!KNOWN_GLC_CATEGORIES.has(rec.category)) {
        errs.push(`glcClasses[${i}] has unknown category "${rec.category}"`);
      }
      return errs;
    }),
  fourWsWeeks: (records) =>
    records.flatMap((r, i) => {
      const rec = r as FourWsWeekRecord;
      const errs: string[] = [];
      if (!rec.slug) errs.push(`fourWsWeeks[${i}] has no slug identity`);
      if (!/^https:\/\/www\.ccf\.org\.ph\/4ws-/.test(rec.standardUrl ?? "")) {
        errs.push(`fourWsWeeks[${i}] standardUrl is not a /4ws-… URL`);
      }
      return errs;
    }),
  fourWsGuides: (records) =>
    records.flatMap((r, i) => {
      const rec = r as FourWsGuideRecord;
      const errs: string[] = [];
      if (!rec.slug) errs.push(`fourWsGuides[${i}] has no slug identity`);
      if (!rec.title) errs.push(`fourWsGuides[${i}] has no title`);
      return errs;
    }),
};

export function validateSection(
  key: SnapshotSection,
  records: unknown[],
): ValidationResult {
  const errors = VALIDATORS[key](records);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Synchronization orchestration.
 *
 * For each requested section: fetch its source page(s) with conditional
 * validators taken from the snapshot's meta, skip on 304 or an unchanged
 * checksum, otherwise parse + sanitize + validate. A section that parses to a
 * valid non-empty batch replaces its snapshot section; a section that 304s,
 * hashes the same, or fails is left untouched. The snapshot is written once,
 * atomically, only when at least one section changed.
 */

import { createHash } from "node:crypto";

import { fetchSource, type FetchImpl } from "./fetch-source";
import { parseFourWsGuide, parseFourWsIndex } from "./parsers/four-ws";
import { parseGlcLibrary } from "./parsers/glc";
import {
  parseChroniclePage,
  parseIntercedePage,
  parseResourcesPage,
  parseScriptureMemoryPage,
} from "./parsers/resources";
import {
  SNAPSHOT_PATH,
  type ContentSnapshot,
  type SectionMeta,
  type SnapshotSection,
  readSnapshotFrom,
  replaceSection,
  validateSection,
  writeSnapshotTo,
} from "./snapshot";
import type { ParseResult, SourceRecord } from "./types";

export const PARSER_VERSION = "1.0.0";

export interface SectionOutcome {
  inserted: number;
  updated: number;
  skipped: number;
  dropped: number;
  error: string | null;
}

export interface SyncSummary {
  snapshotPath: string;
  changed: boolean;
  sections: Partial<Record<SnapshotSection, SectionOutcome>>;
}

interface SectionSpec {
  url: string;
  parse: (html: string, src: SourceRecord, observedAt: string) => ParseResult<unknown>;
}

// Sections fetched from a single page. `fourWsGuides` is not here — it is
// synced separately below because it needs one fetch per week.
const SECTION_SPECS: Record<Exclude<SnapshotSection, "fourWsGuides">, SectionSpec> = {
  resources: {
    url: "https://www.ccf.org.ph/resources/",
    parse: parseResourcesPage as SectionSpec["parse"],
  },
  scriptureMemory: {
    url: "https://www.ccf.org.ph/52-week-scripture/",
    parse: parseScriptureMemoryPage as SectionSpec["parse"],
  },
  chronicleIssues: {
    url: "https://www.ccf.org.ph/chronicle/",
    parse: parseChroniclePage as SectionSpec["parse"],
  },
  intercede: {
    url: "https://www.ccf.org.ph/intercede/",
    parse: parseIntercedePage as SectionSpec["parse"],
  },
  glcClasses: {
    url: "https://glc.ccf.org.ph/",
    parse: parseGlcLibrary as SectionSpec["parse"],
  },
  fourWsWeeks: {
    url: "https://www.ccf.org.ph/4ws/",
    parse: parseFourWsIndex as SectionSpec["parse"],
  },
};

/** How many 4Ws guide pages to fetch per run (the newest weeks first). */
const FOUR_WS_GUIDE_BUDGET = 8;

export const DEFAULT_SECTIONS = [
  ...(Object.keys(SECTION_SPECS) as SnapshotSection[]),
  "fourWsGuides" as SnapshotSection,
];

const CONCURRENCY = 3;

export interface RunContentSyncOptions {
  sections?: SnapshotSection[];
  snapshotPath?: string;
  fetchImpl?: FetchImpl;
  now?: () => string;
}

function checksum(records: unknown): string {
  return createHash("sha256").update(JSON.stringify(records)).digest("hex");
}

function emptyOutcome(): SectionOutcome {
  return { inserted: 0, updated: 0, skipped: 0, dropped: 0, error: null };
}

async function syncSection(
  key: Exclude<SnapshotSection, "fourWsGuides">,
  snapshot: ContentSnapshot,
  opts: Required<Pick<RunContentSyncOptions, "now">> & { fetchImpl?: FetchImpl },
): Promise<{ outcome: SectionOutcome; next?: { records: unknown[]; meta: SectionMeta } }> {
  const spec = SECTION_SPECS[key];
  const prior = snapshot.meta[key];
  const observedAt = opts.now();
  const outcome = emptyOutcome();

  const result = await fetchSource({
    url: new URL(spec.url),
    etag: prior?.checksum ? undefined : undefined,
    fetchImpl: opts.fetchImpl,
  });

  if (result.kind === "not_modified") {
    outcome.skipped = 1;
    return { outcome };
  }
  if (result.kind !== "ok") {
    outcome.error = `fetch ${key}: ${result.kind}`;
    return { outcome };
  }

  const src: SourceRecord = {
    sourceUrl: spec.url,
    canonicalUrl: spec.url,
    resolvedUrl: result.resolvedUrl,
    sourceModifiedAt: result.lastModified,
    fetchedAt: observedAt,
    checksum: checksum(result.body),
    parserVersion: PARSER_VERSION,
  };

  let parsed: ParseResult<unknown>;
  try {
    parsed = spec.parse(result.body, src, observedAt);
  } catch (error) {
    outcome.error = `parse ${key}: ${error instanceof Error ? error.message : String(error)}`;
    return { outcome };
  }

  if (parsed.records.length === 0) {
    // Nothing usable this run; keep the prior section.
    outcome.dropped = 1;
    return { outcome };
  }

  const nextChecksum = checksum(parsed.records);
  if (prior?.checksum === nextChecksum) {
    outcome.skipped = 1;
    return { outcome };
  }

  const validation = validateSection(key, parsed.records);
  if (!validation.ok) {
    outcome.error = `validate ${key}: ${validation.errors.join("; ")}`;
    return { outcome };
  }

  const priorCount = snapshot[key].length;
  outcome.inserted = Math.max(0, parsed.records.length - priorCount);
  outcome.updated = parsed.records.length - outcome.inserted;

  return {
    outcome,
    next: {
      records: parsed.records,
      meta: {
        lastRunAt: observedAt,
        checksum: nextChecksum,
        parserVersion: PARSER_VERSION,
        warnings: parsed.warnings,
      },
    },
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Fetch and parse individual 4Ws guide pages for the newest weeks in the
 * index that do not yet have a stored guide (bounded per run). Uses the
 * GoViral edition when present — its layout is the one the parser handles.
 */
async function syncFourWsGuides(
  snapshot: ContentSnapshot,
  opts: Required<Pick<RunContentSyncOptions, "now">> & { fetchImpl?: FetchImpl },
): Promise<{ outcome: SectionOutcome; next?: { records: unknown[]; meta: SectionMeta } }> {
  const observedAt = opts.now();
  const outcome = emptyOutcome();

  const haveSlugs = new Set(snapshot.fourWsGuides.map((g) => g.slug));
  const weeks = [...snapshot.fourWsWeeks];
  // Newest first (the index is already newest-first; keep that order).
  const targets = weeks
    .filter((w) => {
      const url = w.goViralUrl ?? w.standardUrl;
      return url && !haveSlugs.has(slugFromWeek(w));
    })
    .slice(0, FOUR_WS_GUIDE_BUDGET);

  if (targets.length === 0 && snapshot.fourWsGuides.length > 0) {
    outcome.skipped = 1;
    return { outcome };
  }
  if (targets.length === 0) {
    outcome.dropped = 1;
    return { outcome };
  }

  const fetched = await mapWithConcurrency(targets, CONCURRENCY, async (week) => {
    const url = week.goViralUrl ?? week.standardUrl;
    const res = await fetchSource({ url: new URL(url), fetchImpl: opts.fetchImpl });
    if (res.kind !== "ok") return null;
    const src: SourceRecord = {
      sourceUrl: url,
      canonicalUrl: url,
      resolvedUrl: res.resolvedUrl,
      sourceModifiedAt: res.lastModified,
      fetchedAt: observedAt,
      checksum: checksum(res.body),
      parserVersion: PARSER_VERSION,
    };
    try {
      const { record } = parseFourWsGuide(res.body, src, observedAt);
      // Key the guide by the week's standard slug so pages can look it up.
      return { ...record, slug: slugFromWeek(week) };
    } catch {
      return null;
    }
  });

  const newGuides = fetched.filter((g): g is NonNullable<typeof g> => g != null);
  if (newGuides.length === 0) {
    outcome.dropped = 1;
    return { outcome };
  }

  const merged = [
    ...snapshot.fourWsGuides.filter((g) => !newGuides.some((n) => n.slug === g.slug)),
    ...newGuides,
  ];
  const validation = validateSection("fourWsGuides", merged);
  if (!validation.ok) {
    outcome.error = `validate fourWsGuides: ${validation.errors.join("; ")}`;
    return { outcome };
  }

  outcome.inserted = newGuides.length;
  return {
    outcome,
    next: {
      records: merged,
      meta: {
        lastRunAt: observedAt,
        checksum: checksum(merged),
        parserVersion: PARSER_VERSION,
        warnings: [],
      },
    },
  };
}

function slugFromWeek(week: { slug: string }): string {
  return week.slug;
}

export async function runContentSync(
  options: RunContentSyncOptions = {},
): Promise<SyncSummary> {
  const snapshotPath = options.snapshotPath ?? SNAPSHOT_PATH;
  const now = options.now ?? (() => new Date().toISOString());
  const requestedAll = options.sections ?? DEFAULT_SECTIONS;
  const requested = requestedAll.filter(
    (s): s is Exclude<SnapshotSection, "fourWsGuides"> => s in SECTION_SPECS,
  );
  const wantGuides = requestedAll.includes("fourWsGuides");

  let snapshot = readSnapshotFrom(snapshotPath);
  const sections: SyncSummary["sections"] = {};
  let changed = false;

  const results = await mapWithConcurrency(requested, CONCURRENCY, (key) =>
    syncSection(key, snapshot, { now, fetchImpl: options.fetchImpl }).then(
      (r) => ({ key, ...r }),
    ),
  );

  for (const { key, outcome, next } of results) {
    sections[key] = outcome;
    if (next) {
      snapshot = replaceSection(snapshot, key, next.records as never, next.meta);
      changed = true;
    }
  }

  // 4Ws guides depend on the freshly-synced index, so run them after.
  if (wantGuides) {
    const g = await syncFourWsGuides(snapshot, { now, fetchImpl: options.fetchImpl });
    sections.fourWsGuides = g.outcome;
    if (g.next) {
      snapshot = replaceSection(snapshot, "fourWsGuides", g.next.records as never, g.next.meta);
      changed = true;
    }
  }

  if (changed) writeSnapshotTo(snapshotPath, snapshot);

  return { snapshotPath, changed, sections };
}

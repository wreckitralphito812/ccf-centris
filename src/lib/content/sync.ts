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

const SECTION_SPECS: Record<SnapshotSection, SectionSpec> = {
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
};

export const DEFAULT_SECTIONS = Object.keys(SECTION_SPECS) as SnapshotSection[];

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
  key: SnapshotSection,
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

export async function runContentSync(
  options: RunContentSyncOptions = {},
): Promise<SyncSummary> {
  const snapshotPath = options.snapshotPath ?? SNAPSHOT_PATH;
  const now = options.now ?? (() => new Date().toISOString());
  const requested = (options.sections ?? DEFAULT_SECTIONS).filter(
    (s): s is SnapshotSection => s in SECTION_SPECS,
  );

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

  if (changed) writeSnapshotTo(snapshotPath, snapshot);

  return { snapshotPath, changed, sections };
}

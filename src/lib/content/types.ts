/**
 * Normalized content and synchronization contracts for the CCF public-content
 * pipeline. Every synchronized record carries provenance so a page can always
 * trace a value back to the CCF page it came from.
 *
 * Spec: docs/superpowers/specs/2026-09-03-live-content-sync-design.md
 */

export type ContentKind =
  | "resource"
  | "scripture_memory"
  | "chronicle"
  | "intercede"
  | "glc_class";

/** Provenance shared by every synchronized record. */
export interface SourceRecord {
  /** The URL the sync job requested. */
  sourceUrl: string;
  /** The canonical URL the page declares for itself, when present. */
  canonicalUrl: string;
  /** The URL after any redirects were followed. */
  resolvedUrl: string;
  /** The sitemap `lastmod` for this page in ISO form, when the sitemap had one. */
  sourceModifiedAt: string | null;
  /** When the sync job fetched this record, ISO. */
  fetchedAt: string;
  /** Stable checksum of the normalized record, for incremental skips. */
  checksum: string;
  /** Version of the parser that produced this record. */
  parserVersion: string;
}

export interface ResourceRecord {
  kind: "resource";
  slug: string;
  title: string;
  description: string | null;
  /** Official download or destination URL, or null when CCF lists none. */
  url: string | null;
  format: string | null;
  language: string | null;
  audience: string | null;
  /** True when `url` leaves the CCF host family. */
  external: boolean;
  source: SourceRecord;
}

export interface ScriptureMemoryRecord {
  kind: "scripture_memory";
  year: number;
  week: number;
  reference: string;
  verseText: string | null;
  /** Raw date label as CCF prints it, e.g. "August 30, 2026". */
  dateLabel: string | null;
  /** Normalized date, ISO, or null when unparseable. */
  date: string | null;
  viewUrl: string | null;
  downloadUrl: string | null;
  source: SourceRecord;
}

export interface ChronicleIssueRecord {
  kind: "chronicle";
  /** Stable identity derived from the download id, never the download counter. */
  downloadId: string;
  title: string;
  seriesTitle: string | null;
  serviceDateLabel: string | null;
  serviceDate: string | null;
  downloadUrl: string;
  /** Download count as displayed, plus when it was observed. */
  displayedDownloadCount: number | null;
  downloadCountObservedAt: string | null;
  source: SourceRecord;
}

export interface IntercedeRecord {
  kind: "intercede";
  campaignTitle: string;
  startDate: string | null;
  endDate: string | null;
  /** Sanitized HTML for the primer / guidance body. */
  bodyHtml: string | null;
  biblePlanUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  prayerRequestUrl: string | null;
  source: SourceRecord;
}

/** One GLC library category, in the fixed display order. */
export type GlcCategory =
  | "GLC 1 EDIFY"
  | "GLC 2 EQUIP"
  | "GLC 3 EMPOW"
  | "Apologetics"
  | "Biblical Foundations"
  | "Book Studies"
  | "Discipleship"
  | "Engage"
  | "Evangelism"
  | "Leadership"
  | "Theology and Bible";

export type GlcDeliveryFormat =
  | "face-to-face"
  | "zoom"
  | "e-learning"
  | "dgroup";

export interface GlcClassRecord {
  kind: "glc_class";
  /** Stable key derived from the class URL slug. */
  trackKey: string;
  title: string;
  category: GlcCategory;
  description: string | null;
  formats: GlcDeliveryFormat[];
  /** Official workbook / materials download on glc.ccf.org.ph, when listed. */
  workbookUrl: string | null;
  sortOrder: number;
  active: boolean;
  source: SourceRecord;
}

export type ContentRecord =
  | ResourceRecord
  | ScriptureMemoryRecord
  | ChronicleIssueRecord
  | IntercedeRecord
  | GlcClassRecord;

/** A parser's output: typed records plus non-fatal observations. */
export interface ParseResult<T> {
  records: T[];
  warnings: string[];
}

export type SourceDecision =
  | { allowed: true; reason: "approved_public_source" }
  | {
      allowed: false;
      reason:
        | "host"
        | "rest"
        | "protected"
        | "staging"
        | "transaction"
        | "attachment";
    };

/**
 * Parsers for the four CCF public collections that render as a single index
 * page: the growth-materials Resources grid, the 52-Week Scripture memory
 * archive, the Chronicle download list, and the Intercede campaign page.
 *
 * Every parser takes the page HTML, its SourceRecord, and an observed-at
 * timestamp, and returns typed records plus non-fatal warnings. Missing
 * optional fields are `null`; a record with no stable identity is dropped
 * with a warning rather than guessed at.
 */

import {
  absoluteCcfUrl,
  load,
  mainContent,
  sanitizeImportedHtml,
  type Loaded,
} from "../html";
import type {
  ChronicleIssueRecord,
  IntercedeRecord,
  ParseResult,
  ResourceRecord,
  ScriptureMemoryRecord,
  SourceRecord,
} from "../types";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function text($el: ReturnType<Loaded>): string {
  return $el.first().text().replace(/\s+/g, " ").trim();
}

function isWwwCcfHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "www.ccf.org.ph" || h === "ccf.org.ph";
  } catch {
    return false;
  }
}

/** "August 30, 2026" -> "2026-08-30", else null. */
function normalizeLongDate(label: string): string | null {
  const m = label.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "July 1–4, 2026" -> { start: "2026-07-01", end: "2026-07-04" }. */
function normalizeDateRange(label: string): { start: string | null; end: string | null } {
  const clean = label.replace(/–|—/g, "-");
  const m = clean.match(/([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    const year = Number(m[4]);
    if (month) {
      const p = (d: number) =>
        `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { start: p(Number(m[2])), end: p(Number(m[3])) };
    }
  }
  const single = normalizeLongDate(label);
  return { start: single, end: single };
}

// --- Chronicle --------------------------------------------------------------

const DOWNLOAD_ID_RE = /\/download\/(\d+)\//;
const CHRONICLE_LINE_RE = /^(.+?):\s*(.*?)(?:\s*\((\d[\d,]*)\s*downloads?\))?\s*$/i;

export function parseChroniclePage(
  html: string,
  src: SourceRecord,
  observedAt: string,
): ParseResult<ChronicleIssueRecord> {
  const $ = load(html);
  const root = mainContent($);
  const records: ChronicleIssueRecord[] = [];
  const warnings: string[] = [];

  let seriesTitle: string | null = null;
  root.find("h2, a").each((_i, el) => {
    const node = $(el);
    if (el.tagName === "h2") {
      seriesTitle = text(node) || null;
      return;
    }
    const href = node.attr("href") ?? "";
    const idMatch = href.match(DOWNLOAD_ID_RE) ?? href.match(/\/download\/(\d+)/);
    if (!idMatch) return;

    const raw = text(node);
    const line = raw.match(CHRONICLE_LINE_RE);
    if (!line) {
      warnings.push(`Unparseable Chronicle line: ${raw}`);
      return;
    }
    const downloadUrl = absoluteCcfUrl(href.split("?")[0], src.resolvedUrl);
    if (!downloadUrl) {
      warnings.push(`Bad Chronicle download URL: ${href}`);
      return;
    }
    records.push({
      kind: "chronicle",
      downloadId: idMatch[1],
      title: line[2].trim(),
      seriesTitle,
      serviceDateLabel: line[1].trim() || null,
      serviceDate: null,
      downloadUrl,
      displayedDownloadCount: line[3] ? Number(line[3].replace(/,/g, "")) : null,
      downloadCountObservedAt: line[3] ? observedAt : null,
      source: src,
    });
  });

  return { records, warnings };
}

// --- 52-Week Scripture ----------------------------------------------------

export function parseScriptureMemoryPage(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): ParseResult<ScriptureMemoryRecord> {
  const $ = load(html);
  const root = mainContent($);
  const records: ScriptureMemoryRecord[] = [];
  const warnings: string[] = [];

  let year: number | null = null;
  root.children().each((_i, el) => walk($(el)));

  function walk(node: ReturnType<Loaded>) {
    const el = node.get(0);
    if (!el || !("tagName" in el)) return;
    if (el.tagName === "h2") {
      const y = Number(text(node));
      if (Number.isInteger(y) && y > 2000) year = y;
      return;
    }
    if (node.hasClass("memory-verse")) {
      readVerse(node);
      return;
    }
    node.children().each((_j, child) => walk($(child)));
  }

  function readVerse(node: ReturnType<Loaded>) {
    const weekLabel = text(node.find(".week"));
    const weekMatch = weekLabel.match(/(\d+)/);
    const reference = text(node.find(".reference"));
    if (!weekMatch || !reference) {
      warnings.push(`Scripture week missing week/reference: ${weekLabel} ${reference}`);
      return;
    }
    if (year === null) {
      warnings.push(`Scripture week ${weekLabel} has no preceding year heading`);
      return;
    }
    const verseRaw = text(node.find(".verse-text"));
    const dateLabel = text(node.find(".date")) || null;
    const links = node
      .find("a")
      .toArray()
      .map((a) => ({
        label: text($(a)).toLowerCase(),
        href: absoluteCcfUrl($(a).attr("href") ?? "", src.resolvedUrl),
      }));
    records.push({
      kind: "scripture_memory",
      year,
      week: Number(weekMatch[1]),
      reference,
      verseText: verseRaw || null,
      dateLabel,
      date: dateLabel ? normalizeLongDate(dateLabel) : null,
      viewUrl: links.find((l) => l.label.includes("view"))?.href ?? null,
      downloadUrl: links.find((l) => l.label.includes("download"))?.href ?? null,
      source: src,
    });
  }

  return { records, warnings };
}

// --- Resources ------------------------------------------------------------

export function parseResourcesPage(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): ParseResult<ResourceRecord> {
  const $ = load(html);
  const root = mainContent($);
  const records: ResourceRecord[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  root.find(".resource-card").each((_i, el) => {
    const card = $(el);
    const group = card.closest(".resource-group");
    const audience = group.attr("data-audience") ?? null;
    const title = text(card.find(".resource-title"));
    if (!title) {
      warnings.push("Resource card with no title");
      return;
    }
    let slug = slugify(title);
    if (seen.has(slug)) slug = `${slug}-${records.length}`;
    seen.add(slug);

    const href = card.find(".resource-link").attr("href") ?? "";
    const url = absoluteCcfUrl(href, src.resolvedUrl);

    records.push({
      kind: "resource",
      slug,
      title,
      description: text(card.find(".resource-desc")) || null,
      url,
      format: text(card.find(".resource-action")) || null,
      language: text(card.find(".resource-language")) || null,
      audience,
      external: url ? !isWwwCcfHost(url) : false,
      source: src,
    });
  });

  return { records, warnings };
}

// --- Intercede ----------------------------------------------------------

export function parseIntercedePage(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): ParseResult<IntercedeRecord> {
  const $ = load(html);
  const root = mainContent($);
  const warnings: string[] = [];

  const campaignTitle = text(root.find("h1")) || text($("title"));
  if (!campaignTitle) {
    warnings.push("Intercede page has no title");
    return { records: [], warnings };
  }

  const dateLabel = text(root.find(".campaign-dates"));
  const range = dateLabel
    ? normalizeDateRange(dateLabel)
    : { start: null, end: null };

  const linkFor = (needle: RegExp): string | null => {
    const a = root
      .find("a")
      .toArray()
      .find((el) => needle.test($(el).text()) || needle.test($(el).attr("href") ?? ""));
    return a ? absoluteCcfUrl($(a).attr("href") ?? "", src.resolvedUrl) : null;
  };

  const bodyHtml = sanitizeImportedHtml(root.html() ?? "");

  return {
    records: [
      {
        kind: "intercede",
        campaignTitle,
        startDate: range.start,
        endDate: range.end,
        bodyHtml: bodyHtml || null,
        biblePlanUrl: linkFor(/bible[- ]?(reading )?plan/i),
        audioUrl: linkFor(/audio|spotify|podcast/i),
        videoUrl: linkFor(/promo video|youtube|watch/i),
        prayerRequestUrl: linkFor(/prayer[- ]?request/i),
        source: src,
      },
    ],
    warnings,
  };
}

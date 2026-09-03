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
/**
 * A Chronicle line is either "Mon DD and DD: Title (N downloads)" (recent
 * issues) or just "Title (N downloads)" (older issues). The date prefix and
 * the download counter are both optional.
 */
const CHRONICLE_DATED_RE =
  /^([A-Za-z]+\.?\s+\d{1,2}(?:\s*(?:and|&|-|–|to)\s*\d{1,2})?)\s*:\s*(.+?)(?:\s*\((\d[\d,]*)\s*downloads?\))?\s*$/i;
const CHRONICLE_PLAIN_RE =
  /^(.+?)(?:\s*\((\d[\d,]*)\s*downloads?\))?\s*$/i;

/**
 * "Aug 29 and 30" (or "Jul 18 & 19", "April 25 and 26") -> the later date in
 * ISO form. The year is not in the label; take it from `contextYear` (the sync
 * run's year), then roll back a year if that would place the date in the
 * future relative to the run.
 */
function normalizeServiceWeekend(
  label: string,
  contextYear: number,
  runIso: string,
): string | null {
  const m = label.match(/([A-Za-z]+)\s+(\d{1,2})\s*(?:and|&|-)\s*(\d{1,2})/i)
    ?? label.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = Number(m[3] ?? m[2]);
  let iso = `${contextYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (iso > runIso.slice(0, 10)) {
    iso = `${contextYear - 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return iso;
}

export function parseChroniclePage(
  html: string,
  src: SourceRecord,
  observedAt: string,
): ParseResult<ChronicleIssueRecord> {
  const $ = load(html);
  const root = mainContent($);
  const records: ChronicleIssueRecord[] = [];
  const warnings: string[] = [];
  const runYear = Number(observedAt.slice(0, 4)) || new Date().getUTCFullYear();

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
    const dated = raw.match(CHRONICLE_DATED_RE);
    const plain = dated ? null : raw.match(CHRONICLE_PLAIN_RE);
    const dateLabel = dated ? dated[1].trim() : null;
    const title = (dated ? dated[2] : plain?.[1] ?? "").trim();
    const countStr = dated ? dated[3] : plain?.[2];
    if (!title) {
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
      title,
      seriesTitle,
      serviceDateLabel: dateLabel,
      serviceDate: dateLabel
        ? normalizeServiceWeekend(dateLabel, runYear, observedAt)
        : null,
      downloadUrl,
      displayedDownloadCount: countStr ? Number(countStr.replace(/,/g, "")) : null,
      downloadCountObservedAt: countStr ? observedAt : null,
      source: src,
    });
  });

  return { records, warnings };
}

// --- 52-Week Scripture ----------------------------------------------------

/**
 * Pull `{ week, verse, content }` entries out of the page's verseList script.
 * The list is not keyed by year, so `week` alone is ambiguous across years;
 * key the lookup by `week|reference`, which is unique per row, and fall back
 * to `week` only when the reference did not match.
 */
interface VerseIndex {
  byWeekAndRef: Map<string, string>;
  byWeek: Map<number, string[]>;
}

function readVerseList(html: string): VerseIndex {
  const byWeekAndRef = new Map<string, string>();
  const byWeek = new Map<number, string[]>();
  const block = html.match(/verseList\s*=\s*\[([\s\S]*?)\];/);
  if (!block) return { byWeekAndRef, byWeek };
  const entryRe =
    /\{\s*week:\s*(\d+)\s*,\s*verse:\s*"((?:[^"\\]|\\.)*)"\s*,\s*content:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block[1]))) {
    const week = Number(m[1]);
    const ref = m[2].replace(/\\"/g, '"').trim();
    const content = m[3].replace(/\\"/g, '"').trim();
    byWeekAndRef.set(`${week}|${ref}`, content);
    const list = byWeek.get(week) ?? [];
    list.push(content);
    byWeek.set(week, list);
  }
  return { byWeekAndRef, byWeek };
}

function verseFor(
  index: VerseIndex,
  week: number,
  reference: string,
): string | null {
  const exact = index.byWeekAndRef.get(`${week}|${reference}`);
  if (exact) return exact;
  const byWeek = index.byWeek.get(week);
  return byWeek && byWeek.length === 1 ? byWeek[0] : null;
}

export function parseScriptureMemoryPage(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): ParseResult<ScriptureMemoryRecord> {
  const $ = load(html);
  const root = mainContent($);
  const records: ScriptureMemoryRecord[] = [];
  const warnings: string[] = [];
  const verseIndex = readVerseList(html);

  // Weeks render as .vc_row.vc_inner rows; the year comes from the most recent
  // preceding heading. Walk the page in document order and track both.
  let year: number | null = null;

  root.find("h2, .vc_row.vc_inner").each((_i, el) => {
    const node = $(el);
    if (el.tagName === "h2") {
      const y = Number(text(node));
      if (Number.isInteger(y) && y > 2000) year = y;
      return;
    }
    if (node.find('a[href*="/download/"]').length === 0) return;

    const weekLabel = text(node.find("p:contains('Week')").first());
    const weekMatch = weekLabel.match(/Week\s+(\d+)/i);
    // The reference is the bold <p> that is not the "Week N" one and not a date.
    const pTexts = node
      .find("p")
      .toArray()
      .map((p) => text($(p)))
      .filter(Boolean);
    const reference = pTexts.find(
      (t) => !/^Week\s+\d+/i.test(t) && !/\d{4}$/.test(t),
    );
    const dateLabel = pTexts.find((t) => /[A-Za-z]+\s+\d{1,2},\s*\d{4}/.test(t)) ?? null;

    if (!weekMatch || !reference) {
      warnings.push(`Scripture row missing week/reference: "${weekLabel}"`);
      return;
    }
    if (year === null) {
      warnings.push(`Scripture week ${weekMatch[1]} has no preceding year heading`);
      return;
    }

    const week = Number(weekMatch[1]);
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
      week,
      reference,
      verseText: verseFor(verseIndex, week, reference),
      dateLabel,
      date: dateLabel ? normalizeLongDate(dateLabel) : null,
      viewUrl: links.find((l) => l.label.includes("view") && l.href)?.href ?? null,
      downloadUrl: links.find((l) => l.label.includes("download"))?.href ?? null,
      source: src,
    });
  });

  return { records, warnings };
}

// --- Resources ------------------------------------------------------------

/** "Handout (English)" -> { format: "Handout", language: "English" }. */
function splitActionLabel(label: string): { format: string; language: string | null } {
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) return { format: m[1].trim(), language: m[2].trim() };
  return { format: label.trim(), language: null };
}

export function parseResourcesPage(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): ParseResult<ResourceRecord> {
  const $ = load(html);
  const records: ResourceRecord[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  // Each resource is a `.section_inner_margin.clearfix` block: an image column,
  // an H3 question/title, a short <p> description, and one or more action links
  // labelled "Handout (English)", "Video", "Booklet", etc. The audience is the
  // most recent <h2> before the block.
  $(".section_inner_margin.clearfix").each((_i, el) => {
    const block = $(el);
    const title = text(block.find("h3").first());
    if (!title) return; // spacer / non-resource block

    let slug = slugify(title);
    if (seen.has(slug)) slug = `${slug}-${records.length}`;
    seen.add(slug);

    const audience =
      text(
        block
          .prevAll()
          .find("h2")
          .first(),
      ) ||
      text(block.prevAll("h2").first()) ||
      null;

    const description =
      block
        .find("p")
        .toArray()
        .map((p) => text($(p)))
        .find((t) => t.length > 0) ?? null;

    const actions = block
      .find("a[href]")
      .toArray()
      .map((a) => ({
        label: text($(a)),
        url: absoluteCcfUrl($(a).attr("href") ?? "", src.resolvedUrl),
      }))
      .filter((a) => a.url && !/^#/.test(a.label));

    if (actions.length === 0) {
      records.push({
        kind: "resource",
        slug,
        title,
        description,
        url: null,
        format: null,
        language: null,
        audience,
        external: false,
        source: src,
      });
      return;
    }

    // One record per action link so language variants stay distinct.
    actions.forEach((action, idx) => {
      const { format, language } = splitActionLabel(action.label);
      const variantSlug =
        actions.length > 1 && language
          ? `${slug}-${slugify(language)}`
          : idx === 0
            ? slug
            : `${slug}-${idx}`;
      records.push({
        kind: "resource",
        slug: variantSlug,
        title,
        description,
        url: action.url,
        format: format || null,
        language,
        audience,
        external: action.url ? !isWwwCcfHost(action.url) : false,
        source: src,
      });
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

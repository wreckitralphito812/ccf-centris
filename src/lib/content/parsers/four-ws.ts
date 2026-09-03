/**
 * Parsers for CCF's 4Ws pages.
 *
 * - `parseFourWsIndex` reads https://www.ccf.org.ph/4ws/ : an <h2> is used for
 *   both the year and each series; within a series, each week is a row with a
 *   "Mon DD and DD:" date prefix, a standard-edition link, and usually a
 *   "(GoViral Edition)" link.
 * - `parseFourWsGuide` reads a single 4Ws page. Its section headers render as
 *   images (`<img alt="Worship">` …); a section's content is the markup
 *   between its header image and the next one.
 */

import { load, sanitizeImportedHtml, type Loaded } from "../html";
import type {
  FourWsGuideRecord,
  FourWsWeekRecord,
  ParseResult,
  SourceRecord,
} from "../types";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function text($el: ReturnType<Loaded>): string {
  return $el.first().text().replace(/\s+/g, " ").trim();
}

function slugFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
}

/** "Aug 29 and 30" + a context year -> ISO of the later day, rolled back a year
 *  if that would be in the future relative to the run. */
function normalizeWeekend(
  label: string,
  contextYear: number,
  runIso: string,
): string | null {
  const m =
    label.match(/([A-Za-z]+)\s+(\d{1,2})\s*(?:and|&|-)\s*(\d{1,2})/i) ??
    label.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = Number(m[3] ?? m[2]);
  const pad = (n: number) => String(n).padStart(2, "0");
  let iso = `${contextYear}-${pad(month)}-${pad(day)}`;
  if (iso > runIso.slice(0, 10)) iso = `${contextYear - 1}-${pad(month)}-${pad(day)}`;
  return iso;
}

/** "AUG 30, 2026" -> "2026-08-30". */
function normalizeGuideDate(label: string): string | null {
  const m = label.match(/([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${m[3]}-${pad(month)}-${pad(Number(m[2]))}`;
}

// --- Index --------------------------------------------------------------

const YEAR_RE = /^\s*20\d\d\s*$/;
const GOVIRAL_RE = /\(goviral edition\)/i;

export function parseFourWsIndex(
  html: string,
  src: SourceRecord,
  observedAt: string,
): ParseResult<FourWsWeekRecord> {
  const $ = load(html);
  const records: FourWsWeekRecord[] = [];
  const warnings: string[] = [];
  const runYear = Number(observedAt.slice(0, 4)) || new Date().getUTCFullYear();

  let year: number | null = null;
  let seriesTitle: string | null = null;

  // Group the 4Ws links by their nearest wrapping element so a date prefix and
  // its edition links stay together.
  const wrappers = new Set<ReturnType<Loaded>>();
  $('a[href*="/4ws-"]').each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    if (/\/4ws\/?$/.test(href)) return;
    wrappers.add($(el).closest("li, p, div, td"));
  });

  // Walk the document; track year/series from <h2>, and read each wrapper row.
  $("h2, li, p, div, td").each((_i, el) => {
    const node = $(el);
    if (el.tagName === "h2") {
      const t = text(node);
      if (YEAR_RE.test(t)) year = Number(t);
      else if (t) seriesTitle = t;
      return;
    }
    const links = node
      .children("a")
      .toArray()
      .concat(node.find("> a").toArray())
      .filter((a, i, arr) => arr.indexOf(a) === i)
      .map((a) => ({ text: text($(a)), href: $(a).attr("href") ?? "" }))
      .filter((l) => /\/4ws-/.test(l.href) && !/\/4ws\/?$/.test(l.href));
    if (links.length === 0) return;

    const standard = links.find((l) => !GOVIRAL_RE.test(l.text));
    const goViral = links.find((l) => GOVIRAL_RE.test(l.text));
    const primary = standard ?? goViral;
    if (!primary) return;

    const slug = slugFromUrl(primary.href).replace(/-goviral-edition(-\d+)?$/, "");
    if (records.some((r) => r.slug === slug)) return; // de-dup nested matches

    const rowText = text(node);
    const dateMatch = rowText.match(
      /([A-Za-z]+\s+\d{1,2}(?:\s*(?:and|&|-)\s*\d{1,2})?)\s*:/,
    );
    const serviceDateLabel = dateMatch ? dateMatch[1].trim() : null;

    const title = (standard ?? goViral)!.text.replace(GOVIRAL_RE, "").trim();

    records.push({
      kind: "four_ws_week",
      slug,
      title,
      seriesTitle,
      year,
      serviceDateLabel,
      serviceDate: serviceDateLabel
        ? normalizeWeekend(serviceDateLabel, year ?? runYear, observedAt)
        : null,
      standardUrl: standard?.href ?? goViral!.href,
      goViralUrl: goViral?.href ?? null,
      source: src,
    });
  });

  if (records.length === 0) warnings.push("No 4Ws weeks found on the index");
  return { records, warnings };
}

// --- Guide -----------------------------------------------------------

const SECTION_BY_ALT: [RegExp, keyof FourWsGuideRecord][] = [
  [/^worship$/i, "worshipHtml"],
  [/^welcome$/i, "welcomeHtml"],
  [/^word$/i, "wordHtml"],
  [/^works$/i, "worksHtml"],
  [/weekly prayer points/i, "prayerPointsHtml"],
  [/^memory verse$/i, "memoryVerseText"], // handled specially below
];

function sectionKeyForAlt(alt: string): keyof FourWsGuideRecord | null {
  for (const [re, key] of SECTION_BY_ALT) if (re.test(alt.trim())) return key;
  return null;
}

export function parseFourWsGuide(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): { record: FourWsGuideRecord; warnings: string[] } {
  const $ = load(html);
  const warnings: string[] = [];

  const title =
    text(
      $("strong, h1, h2")
        .filter((_i, e) => /[A-Z]{4}/.test($(e).text()) && $(e).text().trim().length < 120)
        .first(),
    ) || text($("title")).replace(/^4Ws\s*-\s*/i, "").replace(/\s*-\s*Christ's.*$/i, "");

  const dateLabel =
    $("p, span, div")
      .toArray()
      .map((e) => text($(e)))
      .find((t) => /^[A-Za-z]+\.?\s+\d{1,2},\s*20\d\d$/.test(t)) ?? null;

  // A section header renders as `<img alt="Worship">` etc. Several sections can
  // share one Elementor row, so work at the text-block level: walk the content
  // leaves in document order, switch the current section whenever a
  // section-header image is passed, and collect each `.wpb_text_column` /
  // list / paragraph into the current section.
  const sections: Partial<Record<keyof FourWsGuideRecord, string[]>> = {};
  let currentKey: keyof FourWsGuideRecord | null = null;

  const scope = $(".vc_row.wpb_row.section").length
    ? $(".vc_row.wpb_row.section")
    : $("body");

  // Section headers, plus the text blocks that carry content. Prefer
  // `.wpb_text_column`; fall back to bare `<p>`/`<ul>` when the page has none.
  const hasTextColumns = scope.find(".wpb_text_column").length > 0;
  const contentSelector = hasTextColumns
    ? "img[alt], .wpb_text_column"
    : "img[alt], p, ul, ol";
  const seen = new Set<string>();

  scope.find(contentSelector).each((_i, el) => {
    const node = $(el);

    if (el.tagName === "img") {
      const key = sectionKeyForAlt((node.attr("alt") ?? "").trim());
      if (key) currentKey = key;
      return;
    }
    if (!currentKey) return;
    // Skip a text column that only wraps a section-header image, and any
    // element nested inside another one we already collected.
    if (
      node
        .find("img[alt]")
        .toArray()
        .some((img) => sectionKeyForAlt(($(img).attr("alt") ?? "").trim()))
    ) {
      return;
    }
    if (node.parents(".wpb_text_column").length > 0 && hasTextColumns) return;

    const clone = node.clone();
    clone.find("img, noscript, .separator, script").remove();
    // For a wrapper (.wpb_text_column) keep its inner markup; for a bare
    // block (<p>/<li>/<ul>) keep the element itself so paragraph structure
    // survives.
    const markup =
      el.tagName === "div"
        ? (clone.html() ?? "").trim()
        : ($.html(clone) ?? "").trim();
    const flat = clone.text().replace(/\s+/g, " ").trim();
    if (markup && flat && !seen.has(flat)) {
      seen.add(flat);
      (sections[currentKey] ??= []).push(markup);
    }
  });

  const html_ = (key: keyof FourWsGuideRecord): string | null => {
    const parts = sections[key];
    if (!parts || parts.length === 0) return null;
    const clean = sanitizeImportedHtml(parts.join("\n"));
    return clean || null;
  };

  const memoryRaw = sections.memoryVerseText?.join("\n") ?? "";
  const $mem = load(`<div>${memoryRaw}</div>`);
  let memParas = $mem("p, li")
    .toArray()
    .map((p) => $mem(p).text().replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (memParas.length === 0 && memoryRaw.trim()) {
    // No paragraph structure survived — split on line breaks.
    memParas = memoryRaw
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  const record: FourWsGuideRecord = {
    kind: "four_ws_guide",
    slug: slugFromUrl(src.sourceUrl),
    title,
    dateLabel,
    date: dateLabel ? normalizeGuideDate(dateLabel) : null,
    worshipHtml: html_("worshipHtml"),
    welcomeHtml: html_("welcomeHtml"),
    wordHtml: html_("wordHtml"),
    worksHtml: html_("worksHtml"),
    prayerPointsHtml: html_("prayerPointsHtml"),
    memoryVerseReference: memParas[0] ?? null,
    memoryVerseText: memParas.slice(1).join(" ") || null,
    source: src,
  };

  if (!record.title) warnings.push("4Ws guide has no title");
  return { record, warnings };
}

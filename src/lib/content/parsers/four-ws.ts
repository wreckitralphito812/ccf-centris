/**
 * Parsers for CCF's 4Ws pages.
 *
 * - `parseFourWsIndex` reads https://www.ccf.org.ph/4ws/ : an <h2> is used for
 *   both the year and each series; within a series, each week is a row with a
 *   "Mon DD and DD:" date prefix, a standard-edition link, and usually a
 *   "(GoViral Edition)" link.
 * - `parseFourWsGuide` reads a single 4Ws page. Its section headers render as
 *   images (`<img alt="Worship">` …); a section's content is the text between
 *   its header image and the next one, which this parser structures into typed
 *   parts (a question, a song list, scripture points, prayer-point groups …)
 *   rather than passing through flat HTML.
 */

import { load, type Loaded } from "../html";
import type {
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


export { parseFourWsGuide } from "./four-ws-guide";

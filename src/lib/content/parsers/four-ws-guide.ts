/**
 * Structured parser for a single CCF 4Ws guide page.
 *
 * Section headers on the page render as images (`<img alt="Worship">` …). This
 * walks the content in document order, collects the plain-text lines under each
 * header, and turns them into typed parts — a question, a song list, scripture
 * points with references, prayer-point groups — so the guide page can render
 * each with intent instead of passing flat HTML through.
 */

import { load, type Loaded } from "../html";
import type {
  FourWsGuideRecord,
  FourWsPoint,
  FourWsPrayerGroup,
  FourWsWord,
  FourWsWorks,
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

type GuideSection =
  | "welcome"
  | "worship"
  | "word"
  | "works"
  | "prayCareShare"
  | "prayerPoints"
  | "memoryVerse";

const SECTION_BY_ALT: [RegExp, GuideSection][] = [
  [/^welcome$/i, "welcome"],
  [/^worship$/i, "worship"],
  [/^word$/i, "word"],
  [/^works$/i, "works"],
  [/pray care share/i, "prayCareShare"],
  [/weekly prayer points/i, "prayerPoints"],
  [/^memory verse$/i, "memoryVerse"],
];

function sectionForAlt(alt: string): GuideSection | null {
  for (const [re, key] of SECTION_BY_ALT) if (re.test(alt.trim())) return key;
  return null;
}

/** "August 30, 2026" / "AUG 30, 2026" -> "2026-08-30". */
function normalizeGuideDate(label: string): string | null {
  const m = label.match(/([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${m[3]}-${pad(month)}-${pad(Number(m[2]))}`;
}

const ROMAN_HEADING = /^([IVX]+)\.\s+(.+)$/;
const BULLET = /^[•·▪-]\s*/;
const SMART_WORD = /^(Simple|Measurable|Appropriate|Realistic|Time-bound)$/i;

function structureWord(lines: string[]): FourWsWord {
  const word: FourWsWord = {
    passageRef: null,
    readNote: null,
    passageText: null,
    pointItOut: [],
    paraphrase: null,
    talkAbout: [],
    raw: [],
  };
  let block: "head" | "point" | "paraphrase" | "talk" = "head";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^POINT IT OUT!?$/i.test(line)) { block = "point"; continue; }
    if (/^PARAPHRASE IT!?$/i.test(line)) { block = "paraphrase"; continue; }
    if (/^TALK ABOUT IT!?$/i.test(line)) { block = "talk"; continue; }

    if (block === "head") {
      if (/^\(.*\)$/.test(line)) word.readNote = line;
      else if (!word.passageRef && /\d+:\d+/.test(line) && line.length < 40) {
        word.passageRef = line;
      } else {
        word.passageText = word.passageText ? `${word.passageText} ${line}` : line;
      }
      continue;
    }
    if (block === "point") {
      const m = line.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      const point: FourWsPoint = m
        ? { heading: m[1].trim(), refs: m[2].trim() }
        : { heading: line, refs: null };
      word.pointItOut.push(point);
      continue;
    }
    if (block === "paraphrase") {
      word.paraphrase = word.paraphrase ? `${word.paraphrase} ${line}` : line;
      continue;
    }
    if (block === "talk") {
      word.talkAbout.push(line.replace(BULLET, ""));
      continue;
    }
  }
  return word;
}

function structureWorks(lines: string[]): FourWsWorks {
  const works: FourWsWorks = {
    applyIntro: null,
    smart: [],
    iWill: null,
    share: null,
    raw: [],
  };
  let block: "apply" | "share" | "other" = "other";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^APPLY IT!?$/i.test(line)) { block = "apply"; continue; }
    if (/^SHARE IT!?$/i.test(line)) { block = "share"; continue; }

    if (block === "apply") {
      if (SMART_WORD.test(line)) works.smart.push(line);
      else if (/^["“]?I Will\b/i.test(line)) works.iWill = line;
      else works.applyIntro = works.applyIntro ? `${works.applyIntro} ${line}` : line;
      continue;
    }
    if (block === "share") {
      works.share = works.share ? `${works.share} ${line}` : line;
      continue;
    }
    works.raw.push(line);
  }
  return works;
}

function structurePrayCareShare(
  lines: string[],
): { pray: string; care: string; share: string } | null {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  const pray = clean.find((l) => /^(this week, )?pray\b/i.test(l));
  const care = clean.find((l) => /^care\b/i.test(l));
  const share = clean.find((l) => /^share\b/i.test(l));
  if (!pray && !care && !share) return null;
  return { pray: pray ?? "", care: care ?? "", share: share ?? "" };
}

function structurePrayerPoints(lines: string[]): FourWsPrayerGroup[] {
  const groups: FourWsPrayerGroup[] = [];
  let current: FourWsPrayerGroup | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(ROMAN_HEADING);
    if (heading) {
      current = { heading: heading[2].trim(), items: [] };
      groups.push(current);
      continue;
    }
    const item = line.replace(BULLET, "").trim();
    if (!item) continue;
    if (!current) {
      current = { heading: "Prayer points", items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

export function parseFourWsGuide(
  html: string,
  src: SourceRecord,
  _observedAt: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): { record: FourWsGuideRecord; warnings: string[] } {
  const $ = load(html);
  const warnings: string[] = [];

  const title =
    text(
      $("strong, h1, h2")
        .filter(
          (_i, e) =>
            /[A-Z]{4}/.test($(e).text()) && $(e).text().trim().length < 120,
        )
        .first(),
    ) ||
    text($("title"))
      .replace(/^4Ws\s*-\s*/i, "")
      .replace(/\s*-\s*Christ's.*$/i, "");

  const dateLabel =
    $("p, span, div")
      .toArray()
      .map((e) => text($(e)))
      .find((t) => /^[A-Za-z]+\.?\s+\d{1,2},\s*20\d\d$/.test(t)) ?? null;

  const scope = $(".vc_row.wpb_row.section").length
    ? $(".vc_row.wpb_row.section")
    : $("body");
  const hasTextColumns = scope.find(".wpb_text_column").length > 0;
  const selector = hasTextColumns
    ? "img[alt], .wpb_text_column"
    : "img[alt], p, ul, ol";

  const lines: Record<GuideSection, string[]> = {
    welcome: [],
    worship: [],
    word: [],
    works: [],
    prayCareShare: [],
    prayerPoints: [],
    memoryVerse: [],
  };
  let current: GuideSection | null = null;
  const seen = new Set<string>();

  scope.find(selector).each((_i, el) => {
    const node = $(el);

    if (el.tagName === "img") {
      const key = sectionForAlt((node.attr("alt") ?? "").trim());
      if (key) current = key;
      return;
    }
    if (!current) return;
    if (
      node
        .find("img[alt]")
        .toArray()
        .some((img) => sectionForAlt(($(img).attr("alt") ?? "").trim()))
    ) {
      return;
    }
    if (hasTextColumns && node.parents(".wpb_text_column").length > 0) return;

    // Yield each leaf paragraph / list item as its own line.
    const leaves = node.is("p, li")
      ? [node]
      : node.find("p, li").toArray().map((e) => $(e));
    const list = leaves.length ? leaves : [node];

    for (const leaf of list) {
      const t = leaf.text().replace(/\s+/g, " ").trim();
      if (!t || seen.has(`${current}:${t}`)) continue;
      seen.add(`${current}:${t}`);
      lines[current].push(t);
    }
  });

  const welcome = lines.welcome.join(" ").trim() || null;

  // Split on commas and bullets, but not the comma inside a number like
  // "10,000 Reasons".
  const worshipSongs = lines.worship
    .join(", ")
    .split(/\s*(?<!\d),(?!\d)\s*|\s*•\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const word = lines.word.length ? structureWord(lines.word) : null;
  const works = lines.works.length ? structureWorks(lines.works) : null;
  const prayCareShare = structurePrayCareShare(lines.prayCareShare);
  const prayerPoints = structurePrayerPoints(lines.prayerPoints);

  const mem = lines.memoryVerse.map((l) => l.trim()).filter(Boolean);

  const record: FourWsGuideRecord = {
    kind: "four_ws_guide",
    slug: slugFromUrl(src.sourceUrl),
    title,
    dateLabel,
    date: dateLabel ? normalizeGuideDate(dateLabel) : null,
    welcome,
    worshipSongs,
    word,
    works,
    prayCareShare,
    prayerPoints,
    memoryVerseReference: mem[0] ?? null,
    memoryVerseText: mem.slice(1).join(" ") || null,
    source: src,
  };

  if (!record.title) warnings.push("4Ws guide has no title");
  return { record, warnings };
}

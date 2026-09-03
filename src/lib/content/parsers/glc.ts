/**
 * Parser for the GLC library catalogue on `glc.ccf.org.ph`.
 *
 * The GLC home page carries a vertical nav menu of the 11 training categories,
 * each linking to its own page. That menu *is* the catalogue index — this
 * parser turns it into one `GlcClassRecord` per category, links back out to
 * glc.ccf.org.ph, and records the delivery formats the page lists globally.
 * It does not deep-crawl the category pages.
 */

import { absoluteCcfUrl, load } from "../html";
import type {
  GlcCategory,
  GlcClassRecord,
  GlcDeliveryFormat,
  ParseResult,
  SourceRecord,
} from "../types";

/** Menu label -> canonical category name (adds the EDIFY/EQUIP/EMPOW suffix). */
const CATEGORY_BY_LABEL: Record<string, GlcCategory> = {
  "glc 1": "GLC 1 EDIFY",
  "glc 2": "GLC 2 EQUIP",
  "glc 3": "GLC 3 EMPOW",
  apologetics: "Apologetics",
  "biblical foundations": "Biblical Foundations",
  "book studies": "Book Studies",
  discipleship: "Discipleship",
  engage: "Engage",
  evangelism: "Evangelism",
  leadership: "Leadership",
  "theology and bible": "Theology and Bible",
};

const CATEGORY_ORDER: GlcCategory[] = [
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
];

const FORMAT_HINTS: [RegExp, GlcDeliveryFormat][] = [
  [/f2f|face[- ]to[- ]face/i, "face-to-face"],
  [/zoom/i, "zoom"],
  [/e-?learning|online/i, "e-learning"],
  [/dgroup|small group/i, "dgroup"],
];

function slugFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return "";
  }
}

export function parseGlcLibrary(
  html: string,
  src: SourceRecord,
  _observedAt: string,
): ParseResult<GlcClassRecord> {
  const $ = load(html);
  // The category menu is an Elementor nav in the page header, outside <main>,
  // so scan the whole document.
  const root = $.root();
  const warnings: string[] = [];

  // Delivery formats the page lists globally.
  const formats = new Set<GlcDeliveryFormat>();
  root.find("a").each((_i, el) => {
    const label = $(el).text();
    for (const [re, fmt] of FORMAT_HINTS) if (re.test(label)) formats.add(fmt);
  });
  const formatList = [...formats].sort();

  // The category menu: the <ul> whose links cover the known category labels.
  const menus = root.find("ul").toArray();
  let best: ReturnType<typeof $> | null = null;
  let bestHits = 0;
  for (const ul of menus) {
    const node = $(ul);
    const hits = node
      .find("a")
      .toArray()
      .filter((a) => CATEGORY_BY_LABEL[$(a).text().trim().toLowerCase()]).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = node;
    }
  }

  if (!best || bestHits === 0) {
    warnings.push("GLC category menu not found");
    return { records: [], warnings };
  }

  const seen = new Set<GlcCategory>();
  const records: GlcClassRecord[] = [];

  best.find("a").each((_i, el) => {
    const anchor = $(el);
    const label = anchor.text().trim();
    const category = CATEGORY_BY_LABEL[label.toLowerCase()];
    if (!category || seen.has(category)) return;
    seen.add(category);

    const href = absoluteCcfUrl(anchor.attr("href") ?? "", src.resolvedUrl);
    if (!href) {
      warnings.push(`GLC category "${label}" has no usable link`);
      return;
    }
    const trackKey = slugFromUrl(href) || label.toLowerCase().replace(/\s+/g, "-");

    records.push({
      kind: "glc_class",
      trackKey,
      title: label,
      category,
      description: null,
      formats: formatList,
      workbookUrl: null,
      sortOrder: CATEGORY_ORDER.indexOf(category),
      active: true,
      source: { ...src, sourceUrl: href, canonicalUrl: href, resolvedUrl: href },
    });
  });

  records.sort((a, b) => a.sortOrder - b.sortOrder);

  if (records.length < CATEGORY_ORDER.length) {
    warnings.push(
      `GLC catalogue parsed ${records.length}/${CATEGORY_ORDER.length} categories`,
    );
  }

  return { records, warnings };
}

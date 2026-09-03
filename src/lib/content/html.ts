/**
 * HTML sanitization and shared DOM helpers for imported CCF content.
 *
 * Imported bodies are sanitized against a narrow allowlist: headings, text,
 * lists, emphasis, quotes, links, figures, images, and YouTube/Vimeo embeds.
 * Everything else — scripts, styles, forms, event handlers, unknown iframes,
 * unsafe URL schemes — is removed.
 */

import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";

const EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
]);

export function sanitizeImportedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2",
      "h3",
      "h4",
      "p",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "b",
      "i",
      "blockquote",
      "a",
      "br",
      "figure",
      "figcaption",
      "img",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href"],
      img: ["src", "alt"],
      iframe: ["src"],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      // Drop empty href attributes so `<a href="javascript:...">` collapses to `<a>`.
      a: (tagName, attribs) => {
        if (attribs.href && !/^https?:\/\//i.test(attribs.href)) {
          delete attribs.href;
        }
        return { tagName, attribs };
      },
    },
    exclusiveFilter: (frame) => {
      if (frame.tag !== "iframe") return false;
      const src = frame.attribs.src;
      if (!src) return true;
      try {
        return !EMBED_HOSTS.has(new URL(src).hostname);
      } catch {
        return true;
      }
    },
  }).trim();
}

/**
 * Resolve `value` against `base` and return an absolute http(s) URL string, or
 * null when it is empty or uses an unsafe scheme.
 */
export function absoluteCcfUrl(value: string, base: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type Loaded = cheerio.CheerioAPI;

export function load(html: string): Loaded {
  return cheerio.load(html);
}

/**
 * The main editorial region of a CCF page, falling back to <body> when the
 * page has no obvious content landmark.
 */
export function mainContent($: Loaded): cheerio.Cheerio<never> {
  for (const selector of [
    "main",
    "article",
    ".entry-content",
    ".elementor-widget-theme-post-content",
    "#content",
  ]) {
    const node = $(selector).first();
    if (node.length) return node as never;
  }
  return $("body") as never;
}

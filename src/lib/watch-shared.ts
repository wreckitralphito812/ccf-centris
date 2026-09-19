/**
 * Watch helpers with no server dependencies, so they can be tested and used
 * on either side.
 */

/** "2026-09-06" to "September 6, 2026", the way CCF Net writes dates. */
export function replayLabelDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The 11-character YouTube id from anything an admin might paste: a watch,
 * share, embed, live or Shorts link, or the bare id. Null when there isn't one.
 */
export function videoIdFromInput(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|live|shorts|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

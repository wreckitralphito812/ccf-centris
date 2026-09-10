/**
 * Prayer Wall rules shared by the forms, the server actions, and the tests.
 * The database enforces the same limits (0005_screen_names_and_prayer_wall.sql);
 * checking here too means members get a clear message instead of a failure.
 */

export const PRAYER_BODY_MAX = 1000;

/** How long a request stays up. The database sets the actual expiry. */
export const PRAYER_LIFETIME = "two months";

export const SCREEN_NAME_RULE =
  "Use 3 to 24 letters, numbers, spaces, dots, dashes, or underscores, starting and ending with a letter or number.";

const SCREEN_NAME = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,22}[\p{L}\p{N}]$/u;

export function normalizeScreenName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Why a screen name won't do, or null when it's fine. */
export function screenNameProblem(raw: string): string | null {
  const name = normalizeScreenName(raw);
  if (!name) return "Choose a screen name.";
  return SCREEN_NAME.test(name) ? null : SCREEN_NAME_RULE;
}

/** Trim, normalize line endings, and allow at most one blank line in a row. */
export function cleanBody(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function bodyProblem(body: string): string | null {
  if (!body) return "Write something first.";
  if (body.length > PRAYER_BODY_MAX) return `Keep it under ${PRAYER_BODY_MAX} characters.`;
  return null;
}

/**
 * The requests still open at `now`. Authors and moderators can read expired
 * requests too; the wall itself shows only the open ones.
 */
export function openRequests<T extends { expires_at: string }>(
  posts: T[],
  now: Date = new Date(),
): T[] {
  return posts.filter((p) => new Date(p.expires_at).getTime() > now.getTime());
}

/** A same-origin path to return to, or the fallback. */
export function safeNext(raw: unknown, fallback = "/prayer-wall"): string {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

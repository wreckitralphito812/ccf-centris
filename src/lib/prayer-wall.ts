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

/** Roles that moderate the Prayer Wall, as in `has_role()` checks. */
export const MODERATOR_ROLES = ["prayer_team", "satellite_admin"];

/**
 * The replies a viewer may see: unhidden ones, their own, or all of them for
 * a moderator. The database policy `prayer_wall_replies_read` states the same
 * rule; the server applies it now that members' reads run with the service role.
 */
export function visibleReplies<T extends { author_id: string; hidden_at: string | null }>(
  replies: T[],
  viewerId: string,
  isModerator: boolean,
): T[] {
  return replies.filter((r) => isModerator || r.hidden_at === null || r.author_id === viewerId);
}

/** A same-origin path to return to, or the fallback. */
export function safeNext(raw: unknown, fallback = "/prayer-wall"): string {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** Topics a request can carry (0014_prayer_wall_interactive.sql), in chip order. */
export const TOPICS = [
  { id: "health", label: "Health" },
  { id: "family", label: "Family" },
  { id: "work", label: "Work and school" },
  { id: "guidance", label: "Guidance" },
  { id: "thanks", label: "Thanksgiving" },
  { id: "other", label: "Other" },
] as const;

export type Topic = (typeof TOPICS)[number]["id"];

export const isTopic = (v: unknown): v is Topic => TOPICS.some((t) => t.id === v);

export const topicLabel = (t: Topic) => TOPICS.find((x) => x.id === t)!.label;

/**
 * A screen name to offer a member who hasn't chosen one: first name and last
 * initial ("Ralph R"), so one tap gets them onto the wall. Empty when their
 * name wouldn't make a valid screen name.
 */
export function suggestScreenName(first: string | null, last: string | null): string {
  const f = normalizeScreenName(first ?? "").split(" ")[0] ?? "";
  const l = normalizeScreenName(last ?? "").charAt(0).toUpperCase();
  const name = l ? `${f} ${l}` : f;
  return screenNameProblem(name) ? "" : name;
}

/** Up to two initials for an avatar: "Ralph R" → "RR", "tita_beth" → "TI". */
export function initials(name: string): string {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

const shortDay = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });

/** "Just now", "5m", "3h", "2d", then a date ("Oct 1") after a week. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const mins = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 7) return `${Math.floor(mins / (60 * 24))}d`;
  return shortDay.format(new Date(iso));
}

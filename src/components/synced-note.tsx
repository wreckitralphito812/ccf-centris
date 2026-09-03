import { SITE } from "@/lib/site";

/** Coarse "3 hours ago" / "yesterday" / "2 weeks ago". */
function relative(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
}

/**
 * A quiet line saying when this content was last pulled from ccf.org.ph.
 * Renders nothing when the section has never synced (seed-data fallback).
 */
export function SyncedNote({
  lastRunAt,
  source,
}: {
  lastRunAt: string | null;
  /** e.g. "ccf.org.ph/chronicle" — shown as plain text, not a link. */
  source: string;
}) {
  if (!lastRunAt) return null;
  const abs = new Date(lastRunAt).toLocaleString("en-PH", {
    timeZone: SITE.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <p className="label mt-6 text-ink-mute">
      Synced from {source} ·{" "}
      <time dateTime={lastRunAt} title={abs}>
        {relative(lastRunAt)}
      </time>
    </p>
  );
}

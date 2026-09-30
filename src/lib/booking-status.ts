/**
 * Plain words and tones for booking statuses, and how soon a booking is.
 * Shared by /reserve, My reservations and the confirmations (2026-09-30).
 * Tones map to CCF colours: ok = teal, wait = maroon, grey = muted.
 */
export type BadgeTone = "ok" | "wait" | "grey";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Confirmed", tone: "ok" },
  confirmed: { label: "Confirmed", tone: "ok" },
  pending: { label: "Awaiting approval", tone: "wait" },
  rejected: { label: "Declined", tone: "grey" },
  cancelled: { label: "Cancelled", tone: "grey" },
  completed: { label: "Done", tone: "grey" },
};

export function statusBadge(status: string): { label: string; tone: BadgeTone } {
  return STATUS[status] ?? { label: status, tone: "grey" };
}

const DAY = 86_400_000;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** "Today", "Tomorrow", "In 3 days", or "Wed, Oct 14" a week or more out. Both dates Manila "YYYY-MM-DD". */
export function whenLabel(date: string, today: string): string {
  const days = Math.round((utc(date) - utc(today)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const d = new Date(utc(date));
  return `${WEEKDAY[d.getUTCDay()]}, ${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

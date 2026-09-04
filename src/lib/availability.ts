import type { Slot } from "@/lib/types";

/**
 * Mark an hourly grid for one court on one day, given the bookings and
 * blackouts that touch it. Pure — the DB query lives in queries.ts; this is
 * the part worth testing.
 */

export interface Busy {
  /** ISO start/end of a reservation or blackout window. */
  start: string;
  end: string;
  /** A confirmed booking greys the slot; a pending one is marked pending. */
  kind: "reserved" | "pending" | "blackout";
}

function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

export function markSlots(
  dateKey: string,
  openHour: number,
  closeHour: number,
  busy: Busy[],
  now: Date = new Date(),
): Slot[] {
  const out: Slot[] = [];
  const nowMs = now.getTime();

  for (let hour = openHour; hour < closeHour; hour++) {
    const start = new Date(
      `${dateKey}T${String(hour).padStart(2, "0")}:00:00+08:00`,
    );
    const end = new Date(start.getTime() + 3600_000);
    const s = start.getTime();
    const e = end.getTime();

    let state: Slot["state"];
    if (e <= nowMs) {
      state = "unavailable";
    } else {
      const hit = busy.find((b) =>
        overlaps(s, e, new Date(b.start).getTime(), new Date(b.end).getTime()),
      );
      if (hit) state = hit.kind === "pending" ? "pending" : "reserved";
      else state = "available";
    }

    out.push({ start: start.toISOString(), end: end.toISOString(), state });
  }

  return out;
}

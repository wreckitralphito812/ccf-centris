import type { Facility } from "@/lib/types";

/**
 * Rooms a ministry can request at /centris/reserve. The Sports Hall (anything
 * with courts) waits for its own booking flow, and the Dgroup Lounge is booked
 * through Dgroup tables at /reserve/dgroup.
 */
export function isRequestableRoom(f: Facility): boolean {
  return (
    f.courts.length === 0 &&
    f.kind !== "sports_hall" &&
    f.kind !== "court" &&
    f.kind !== "lounge"
  );
}

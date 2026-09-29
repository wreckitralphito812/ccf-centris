import type { Facility } from "@/lib/types";
import { ministryRoom } from "@/lib/ministry-rooms";

/** Rooms a ministry can request at /centris/reserve. See src/lib/ministry-rooms.ts. */
export function isRequestableRoom(f: Facility): boolean {
  return ministryRoom(f.slug) !== null;
}

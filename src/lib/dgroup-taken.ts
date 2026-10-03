import "server-only";

import { blockedLabels } from "@/lib/dgroup-blocks";
import { DGROUP_ROOMS, tableKey } from "@/lib/dgroup-tables";
import { getTableBlocks } from "@/lib/queries";
import { SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/** Tables already held, or blocked by an admin, for a day and slot, as tableKey()s. */
export async function takenTables(date: string, slotId: string, exceptBooking?: string) {
  const [{ data, error }, blocks] = await Promise.all([
    supabaseAdmin()
      .from("dgroup_table_bookings")
      .select("id, room_slug, table_labels")
      .eq("satellite_id", SATELLITE_ID)
      .eq("booked_on", date)
      .eq("slot_id", slotId)
      .in("status", ["pending", "confirmed"]),
    getTableBlocks({ dates: [date] }),
  ]);
  if (error) throw error;
  const taken = new Set<string>();
  for (const r of (data ?? []) as { id: string; room_slug: string; table_labels: string[] }[]) {
    if (r.id === exceptBooking) continue;
    for (const l of r.table_labels) taken.add(tableKey(r.room_slug, l));
  }
  for (const room of DGROUP_ROOMS) {
    for (const l of blockedLabels(blocks, room.slug, date, slotId)) taken.add(tableKey(room.slug, l));
  }
  return taken;
}

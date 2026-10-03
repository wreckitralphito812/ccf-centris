/**
 * Admin blocks on Dgroup tables (0015_dgroup_table_blocks.sql, 2026-10-03).
 * A block with no table covers every table in its room; one with no slot
 * covers every slot that day. These turn blocks into the same shapes the
 * booking code already understands, so a blocked table reads as taken.
 * Pure, so it's tested without a database.
 */
import { DGROUP_ROOMS, DGROUP_SLOTS, type DgroupHold } from "@/lib/dgroup-tables";

export interface TableBlock {
  id: string;
  room_slug: string;
  /** Null: every table in the room. */
  table_label: string | null;
  booked_on: string;
  /** Null: every slot that day. */
  slot_id: string | null;
  reason: string | null;
}

const labelsOf = (room: string) => DGROUP_ROOMS.find((r) => r.slug === room)?.tables.map((t) => t.label) ?? [];

/** The table labels a block takes out of `room` on `date` in `slot`. */
export function blockedLabels(blocks: TableBlock[], room: string, date: string, slot: string): string[] {
  const out = new Set<string>();
  for (const b of blocks) {
    if (b.room_slug !== room || b.booked_on !== date) continue;
    if (b.slot_id && b.slot_id !== slot) continue;
    for (const l of b.table_label ? [b.table_label] : labelsOf(room)) out.add(l);
  }
  return [...out];
}

/** Blocks as holds, for the availability counts on the booking page. */
export function blocksAsHolds(blocks: TableBlock[]): DgroupHold[] {
  return blocks.flatMap((b) =>
    (b.slot_id ? [b.slot_id] : DGROUP_SLOTS.map((s) => s.id)).map((slot) => ({
      booked_on: b.booked_on,
      slot_id: slot,
      room_slug: b.room_slug,
      table_labels: b.table_label ? [b.table_label] : labelsOf(b.room_slug),
    })),
  );
}

/** "Table 9, all day" / "Welcome Center, 1:00 – 3:30 PM" — for admin lists. */
export function describeBlock(b: TableBlock, roomName: (s: string) => string, slotLabel: (s: string) => string): string {
  const what = b.table_label ? `Table ${b.table_label}, ${roomName(b.room_slug)}` : `All of ${roomName(b.room_slug)}`;
  return `${what} · ${b.slot_id ? slotLabel(b.slot_id) : "all day"}`;
}

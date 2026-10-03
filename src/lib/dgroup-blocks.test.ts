import assert from "node:assert/strict";
import test from "node:test";

import { blockedLabels, blocksAsHolds, describeBlock, type TableBlock } from "./dgroup-blocks";
import { DGROUP_ROOMS, roomName, slotLabel } from "./dgroup-tables";

const b = (o: Partial<TableBlock>): TableBlock => ({
  id: "b", room_slug: "welcome-center", table_label: "9", booked_on: "2026-10-12", slot_id: null, reason: null, ...o,
});
const wcTables = DGROUP_ROOMS.find((r) => r.slug === "welcome-center")!.tables.length;

test("a single-table, all-day block takes that table out of every slot", () => {
  for (const slot of ["1300", "1600", "1900"]) {
    assert.deepEqual(blockedLabels([b({})], "welcome-center", "2026-10-12", slot), ["9"]);
  }
  assert.deepEqual(blockedLabels([b({})], "welcome-center", "2026-10-13", "1300"), []);
  assert.deepEqual(blockedLabels([b({})], "dgroup-lounge", "2026-10-12", "1300"), []);
});

test("a whole-room block for one slot covers every table, only in that slot", () => {
  const blocks = [b({ table_label: null, slot_id: "1300" })];
  assert.equal(blockedLabels(blocks, "welcome-center", "2026-10-12", "1300").length, wcTables);
  assert.deepEqual(blockedLabels(blocks, "welcome-center", "2026-10-12", "1600"), []);
});

test("blocks become holds the availability counts understand", () => {
  const holds = blocksAsHolds([b({}), b({ table_label: null, slot_id: "1900", room_slug: "dgroup-lounge" })]);
  assert.equal(holds.length, 3 + 1);
  assert.deepEqual(holds[0], { booked_on: "2026-10-12", slot_id: "1300", room_slug: "welcome-center", table_labels: ["9"] });
  assert.equal(holds[3].table_labels.length, DGROUP_ROOMS.find((r) => r.slug === "dgroup-lounge")!.tables.length);
});

test("blocks read plainly in admin lists", () => {
  assert.equal(describeBlock(b({}), roomName, slotLabel), "Table 9, Welcome Center · all day");
  assert.equal(
    describeBlock(b({ table_label: null, slot_id: "1300" }), roomName, slotLabel),
    "All of Welcome Center · 1:00 – 3:30 PM",
  );
});

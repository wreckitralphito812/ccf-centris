import type { ReactNode } from "react";
import { FLOOR_PLANS, type FloorItem } from "@/lib/dgroup-floor";
import { DGROUP_ROOMS } from "@/lib/dgroup-tables";

/**
 * A Dgroup room drawn from its floor plan: solid tables with their number, a
 * chair for every seat so leaders can read table sizes at a glance, the
 * lounge furniture in a soft tone, and the entrance marked. The leader's
 * tables are filled in CCF teal.
 *
 * Written for two renderers at once: the booking page (React DOM) and the
 * email image (next/og, i.e. Satori). So it uses inline styles, pixel sizes,
 * absolute positioning, and `display: flex` on every box: the subset Satori
 * understands. Don't reach for Tailwind classes or percentages here.
 */

const WALL = "#1d2b2d";
const FLOOR = "#f7fafa";
const TABLE_LINE = "#9db3b6";
const TABLE_TEXT = "#324548";
const CHAIR = "#d3e0e2";
const FURNITURE = "#e9f0f1";
const PICKED = "#007682";
const PICKED_CHAIR = "#8cc4c9";

/** Wall thickness for a drawing of this width. */
const wallFor = (width: number) => Math.max(3, Math.round(width / 140));

/**
 * The drawing's full height at a given width, walls included. The email route
 * sizes its image with this, so the two can't drift apart.
 */
export function floorPlanHeight(room: string, width: number): number {
  const plan = FLOOR_PLANS[room];
  if (!plan) return 0;
  const wall = wallFor(width);
  return Math.round((width - wall * 2) / plan.aspect) + wall * 2;
}

/** The width that makes the drawing a given height, for side-by-side plans. */
export function floorPlanWidthForHeight(room: string, height: number): number {
  const plan = FLOOR_PLANS[room];
  if (!plan) return 0;
  return Math.round(height * plan.aspect);
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the table top and its chairs sit inside a table's footprint. Chairs go
 * along the two long sides, split as evenly as the seat count allows; a bench
 * of three or fewer against a wall gets them all on its open (top) side, and a
 * two-seat round gets one either side.
 */
function layoutTable(box: Rect, seats: number, shape: FloorItem["shape"]): { top: Rect; chairs: Rect[] } {
  const chair = Math.max(5, Math.round(Math.min(box.width, box.height) * (shape === "round" ? 0.26 : 0.2)));
  const gap = Math.max(2, Math.round(chair * 0.35));
  const edge = chair + gap;
  const chairs: Rect[] = [];

  // Evenly spaced chairs along one side of the table top.
  const along = (count: number, side: "top" | "bottom" | "left" | "right", top: Rect) => {
    if (count <= 0) return;
    const horizontal = side === "top" || side === "bottom";
    const span = horizontal ? top.width : top.height;
    const long = Math.max(chair, Math.round(Math.min(span / count - gap, chair * 1.9)));
    for (let i = 0; i < count; i++) {
      const centre = (span / count) * (i + 0.5);
      if (horizontal) {
        chairs.push({
          left: Math.round(top.left + centre - long / 2),
          top: side === "top" ? top.top - edge : top.top + top.height + gap,
          width: long,
          height: chair,
        });
      } else {
        chairs.push({
          left: side === "left" ? top.left - edge : top.left + top.width + gap,
          top: Math.round(top.top + centre - long / 2),
          width: chair,
          height: long,
        });
      }
    }
  };

  // A small round: a circle in the middle of its footprint, with round stools
  // above and below (the rounds sit in side-by-side pairs, so there's no room
  // between them); they may sit just past the footprint's edge.
  if (shape === "round") {
    const d = Math.round(Math.min(box.width, box.height) * 0.64);
    const stool = Math.max(6, Math.round(d * 0.42));
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const top = { left: Math.round(cx - d / 2), top: Math.round(cy - d / 2), width: d, height: d };
    const sides = seats >= 2 ? [-1, 1] : [-1];
    for (const side of sides) {
      chairs.push({
        left: Math.round(cx - stool / 2),
        top: Math.round(cy + side * (d / 2 + gap + stool / 2) - stool / 2),
        width: stool,
        height: stool,
      });
    }
    return { top, chairs };
  }

  if (seats <= 3) {
    const top = { left: box.left, top: box.top + edge, width: box.width, height: box.height - edge };
    along(seats, "top", top);
    return { top, chairs };
  }

  // Near-square tables read better with chairs above and below, like their
  // neighbours, so only clearly tall footprints get chairs at the sides.
  if (box.width >= box.height * 0.85) {
    const top = { left: box.left, top: box.top + edge, width: box.width, height: box.height - edge * 2 };
    along(Math.ceil(seats / 2), "top", top);
    along(Math.floor(seats / 2), "bottom", top);
    return { top, chairs };
  }

  const top = { left: box.left + edge, top: box.top, width: box.width - edge * 2, height: box.height };
  along(Math.ceil(seats / 2), "left", top);
  along(Math.floor(seats / 2), "right", top);
  return { top, chairs };
}

export function FloorPlanDrawing({
  room,
  highlight,
  width,
}: {
  room: string;
  highlight: readonly string[];
  width: number;
}) {
  const plan = FLOOR_PLANS[room];
  if (!plan) return null;
  const seatsFor = new Map(
    (DGROUP_ROOMS.find((r) => r.slug === room)?.tables ?? []).map((t) => [t.label, t.seats]),
  );
  const wall = wallFor(width);
  const inner = width - wall * 2;
  const innerH = Math.round(inner / plan.aspect);
  const px = (pct: number, of: number) => Math.round((pct / 100) * of);
  const picked = new Set(highlight);
  const labelSize = Math.max(10, Math.round(width / 26));

  const pieces: ReactNode[] = [];

  plan.items.forEach((item, i) => {
    const box = { left: px(item.x, inner), top: px(item.y, innerH), width: px(item.w, inner), height: px(item.h, innerH) };

    // Lounge seating and counters: not bookable, drawn quietly.
    if (item.label === undefined) {
      pieces.push(
        <div
          key={`f${i}`}
          style={{ position: "absolute", display: "flex", ...box, borderRadius: Math.round(Math.min(box.width, box.height) * 0.25), background: FURNITURE }}
        />,
      );
      return;
    }

    const on = picked.has(item.label);
    const { top, chairs } = layoutTable(box, seatsFor.get(item.label) ?? 4, item.shape);
    chairs.forEach((c, j) =>
      pieces.push(
        <div
          key={`c${item.label}-${j}`}
          style={{ position: "absolute", display: "flex", ...c, borderRadius: Math.round(Math.min(c.width, c.height) / 2), background: on ? PICKED_CHAIR : CHAIR }}
        />,
      ),
    );
    pieces.push(
      <div
        key={`t${item.label}`}
        style={{
          position: "absolute",
          ...top,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: item.shape === "round" ? Math.max(top.width, top.height) : Math.max(3, Math.round(Math.min(top.width, top.height) * 0.14)),
          background: on ? PICKED : "#ffffff",
          border: `${on ? 2 : 1.5}px solid ${on ? PICKED : TABLE_LINE}`,
          color: on ? "#ffffff" : TABLE_TEXT,
          fontSize: item.shape === "round" ? Math.max(9, Math.round(labelSize * 0.8)) : labelSize,
          fontWeight: 700,
        }}
      >
        {item.label}
      </div>,
    );
  });

  const doorLabel = Math.max(9, Math.round(width / 40));

  return (
    <div
      role="img"
      aria-label={
        highlight.length
          ? `Floor plan of the room with ${highlight.length === 1 ? "table" : "tables"} ${highlight.join(" and ")} highlighted`
          : "Floor plan of the room with every table numbered"
      }
      style={{ position: "relative", display: "flex", width, height: innerH + wall * 2, background: WALL, borderRadius: 2 }}
    >
      <div style={{ position: "absolute", left: wall, top: wall, width: inner, height: innerH, display: "flex", background: FLOOR }}>
        {pieces}
      </div>
      {/* Door openings: gaps in the wall, each with a small label inside. */}
      {plan.doors.map((d, i) => {
        const bottom = d.wall === "bottom";
        const gap = bottom
          ? { left: wall + px(d.from, inner), top: innerH + wall, width: px(d.to - d.from, inner), height: wall }
          : { left: 0, top: wall + px(d.from, innerH), width: wall, height: px(d.to - d.from, innerH) };
        return [
          <div key={`door${i}`} style={{ position: "absolute", display: "flex", background: FLOOR, ...gap }} />,
          <div
            key={`doorl${i}`}
            style={{
              position: "absolute",
              display: "flex",
              color: "#7b8d90",
              fontSize: doorLabel,
              fontWeight: 600,
              letterSpacing: 0.5,
              ...(bottom
                ? { left: gap.left, top: gap.top - doorLabel - 6, width: gap.width, justifyContent: "center" }
                : { left: wall + 4, top: gap.top + Math.round(gap.height / 2) - doorLabel / 2 - 1 }),
            }}
          >
            ENTRANCE
          </div>,
        ];
      })}
    </div>
  );
}

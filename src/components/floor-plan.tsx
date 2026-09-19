import { FLOOR_PLANS, type FloorItem } from "@/lib/dgroup-floor";

/**
 * A Dgroup room drawn from its floor plan, with the leader's tables
 * highlighted in CCF teal.
 *
 * Written for two renderers at once: the booking page (React DOM) and the
 * email image (next/og, i.e. Satori). So it uses inline styles, pixel sizes,
 * absolute positioning, and `display: flex` on every box: the subset Satori
 * understands. Don't reach for Tailwind classes or percentages here.
 */

const INK = "#223032";
const MUTE = "#6b7a7c";
const LINE = "#b9c9cc";
const FURNITURE = "#e6eef0";
const PICKED = "#007682";

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
  const wall = Math.max(3, Math.round(width / 140));
  const inner = width - wall * 2;
  const innerH = Math.round(inner / plan.aspect);
  const px = (pct: number, of: number) => Math.round((pct / 100) * of);
  const picked = new Set(highlight);

  const box = (item: FloorItem, i: number) => {
    const on = item.label !== undefined && picked.has(item.label);
    const w = px(item.w, inner);
    const h = px(item.h, innerH);
    const radius =
      item.shape === "round" ? Math.max(w, h) : item.shape === "cluster" ? Math.round(Math.min(w, h) * 0.22) : 4;
    const furniture = item.label === undefined;
    return (
      <div
        key={item.label ?? `f${i}`}
        style={{
          position: "absolute",
          left: px(item.x, inner),
          top: px(item.y, innerH),
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          background: on ? PICKED : furniture ? FURNITURE : "#ffffff",
          border: furniture ? "none" : `${on ? 2 : 1.5}px ${on ? "solid" : "dashed"} ${on ? PICKED : LINE}`,
          color: on ? "#ffffff" : MUTE,
          fontSize: Math.max(11, Math.round(width / (item.shape === "round" ? 34 : 24))),
          fontWeight: on ? 700 : 500,
        }}
      >
        {item.label ?? ""}
      </div>
    );
  };

  return (
    <div
      role="img"
      aria-label={`Floor plan of the room with ${highlight.length === 1 ? "table" : "tables"} ${highlight.join(" and ")} highlighted`}
      style={{
        position: "relative",
        display: "flex",
        width,
        height: innerH + wall * 2,
        background: INK,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: wall,
          top: wall,
          width: inner,
          height: innerH,
          display: "flex",
          background: "#ffffff",
        }}
      >
        {plan.items.map(box)}
      </div>
      {/* Door openings: gaps in the wall. */}
      {plan.doors.map((d, i) => (
        <div
          key={`door${i}`}
          style={{
            position: "absolute",
            display: "flex",
            background: "#ffffff",
            ...(d.wall === "bottom"
              ? { left: wall + px(d.from, inner), top: innerH + wall, width: px(d.to - d.from, inner), height: wall }
              : { left: 0, top: wall + px(d.from, innerH), width: wall, height: px(d.to - d.from, innerH) }),
          }}
        />
      ))}
    </div>
  );
}

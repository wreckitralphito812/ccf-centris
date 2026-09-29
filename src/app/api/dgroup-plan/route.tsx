import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { FloorPlanDrawing, floorPlanHeight } from "@/components/floor-plan";
import { FLOOR_PLANS } from "@/lib/dgroup-floor";
import { DGROUP_ROOMS, tablesLabel } from "@/lib/dgroup-tables";

/**
 * The floor plan as a PNG, for the confirmation email: /api/dgroup-plan?room=
 * welcome-center&t=4,5. Email clients don't render SVG or CSS layouts reliably,
 * but every one shows an image.
 *
 * The URL carries only a room and table numbers, nothing about the booking or
 * the leader, so it's safe to serve publicly and cache hard.
 */
export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room") ?? "";
  const def = DGROUP_ROOMS.find((r) => r.slug === room);
  const plan = FLOOR_PLANS[room];
  if (!def || !plan) return new Response("Unknown room", { status: 404 });

  const valid = new Set(def.tables.map((t) => t.label));
  const tables = (req.nextUrl.searchParams.get("t") ?? "")
    .split(",")
    .filter((l) => valid.has(l))
    .slice(0, 4);

  const width = 520;
  const pad = 24;
  const planH = floorPlanHeight(room, width);
  const head = 56;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f4f7f7",
          padding: pad,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: head - 12 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#142021" }}>{def.name}</div>
          {tables.length ? (
            <div style={{ display: "flex", alignItems: "center", fontSize: 16, color: "#007682", fontWeight: 700 }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 3, background: "#007682", marginRight: 8 }} />
              {`Your ${tablesLabel(tables).toLowerCase()}`}
            </div>
          ) : null}
        </div>
        <FloorPlanDrawing room={room} highlight={tables} width={width} />
      </div>
    ),
    {
      width: width + pad * 2,
      height: planH + head + pad * 2,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}

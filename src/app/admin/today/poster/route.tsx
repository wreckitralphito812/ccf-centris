import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { isDateKey } from "@/lib/admin-day";
import { fitLine, POSTER_LIST_HEIGHT, posterLayout, posterRooms } from "@/lib/day-poster";
import { WEEKDAY_NAMES } from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { timeLabel } from "@/lib/ministry-rooms";
import { getAdminEvents, getCourtRentals, getDgroupTableBookings, getReservations } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const INK = "#0d2b3a";
const SOFT = "#2b4654";
const MUTE = "#4d6878";
const TEAL = "#007a87";
const PAPER = "#f8fafb";
const SIDE = 48;

/**
 * The day poster as a 1080 × 1920 PNG (9:16, portrait), for the TV by the
 * guard's desk (Adrian, 2026-11-15): /admin/today/poster?d=2026-11-18. Room by
 * room since 2026-11-17, under a compact heading so the schedule gets the
 * room. Admins only: it names who has each room, court and table, though
 * never their phone numbers or emails (lib/day-poster).
 */
export async function GET(req: NextRequest) {
  if (isAdminConfigured() && !(await isAdmin())) return new Response("Sign in to the admin console first.", { status: 401 });

  const d = req.nextUrl.searchParams.get("d");
  const date = isDateKey(d) ? d : manilaDateKey();
  const [events, rooms, rentals, tables] = await Promise.all([
    getAdminEvents(),
    getReservations(),
    getCourtRentals(),
    getDgroupTableBookings(),
  ]);
  const L = posterLayout(posterRooms({ date, events, rooms, rentals, tables }));

  const day = new Date(`${date}T00:00:00Z`);
  const heading = `${WEEKDAY_NAMES[day.getUTCDay()]}, ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
  const logo = new URL("/logos/ccf-centris-horizontal.png", req.url).toString();
  // The width left for a row's text: the poster less the page margins, the row's padding and border, and the time column.
  const timeWidth = Math.round(L.time * 6.2);
  const textWidth = 1080 - SIDE * 2 - 24 * 2 - 4 - timeWidth - 18;
  const until = (to: number | null) => (to === null ? "" : `to ${timeLabel(to)}`);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, fontFamily: "sans-serif" }}>
        {/* A compact heading (Adrian, 2026-11-17): the logo beside the date, so the schedule gets the room. */}
        <div style={{ display: "flex", alignItems: "center", height: 220, padding: `0 ${SIDE}px`, background: "#ffffff", borderBottom: `6px solid ${TEAL}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={220} height={92} alt="" />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 36 }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: TEAL }}>TODAY AT CCF CENTRIS</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: fitLine(heading, 52, 1080 - SIDE * 2 - 220 - 36, 36).size, fontWeight: 800, color: INK }}>
              {heading}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", height: POSTER_LIST_HEIGHT, marginTop: 24, padding: `0 ${SIDE}px`, overflow: "hidden" }}>
          {L.rooms.length ? (
            L.rooms.map((room) => (
              <div key={room.key} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: L.heading,
                    marginBottom: L.gap,
                    paddingLeft: 18,
                    borderLeft: `8px solid ${TEAL}`,
                    fontSize: Math.round(L.heading * 0.58),
                    fontWeight: 800,
                    color: TEAL,
                  }}
                >
                  {room.name}
                </div>
                {room.items.map((i) => {
                  const title = fitLine(i.title, L.title, textWidth, Math.round(L.title * 0.68));
                  const detail = i.detail ? fitLine(i.detail, L.detail, textWidth, Math.round(L.detail * 0.75)) : null;
                  return (
                    <div
                      key={i.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: L.row,
                        flexShrink: 0,
                        marginBottom: L.gap,
                        padding: "0 24px",
                        background: "#ffffff",
                        borderRadius: 14,
                        border: "2px solid #dbe5ea",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", width: timeWidth, flexShrink: 0 }}>
                        <div style={{ display: "flex", fontSize: L.time, fontWeight: 700, color: TEAL }}>{i.from === null ? "All day" : timeLabel(i.from)}</div>
                        {i.from !== null && i.to !== null ? (
                          <div style={{ display: "flex", fontSize: Math.round(L.time * 0.72), color: MUTE }}>{until(i.to)}</div>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", marginLeft: 18, width: textWidth, overflow: "hidden" }}>
                        <div style={{ display: "flex", fontSize: title.size, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>{title.text}</div>
                        {detail ? (
                          <div style={{ display: "flex", marginTop: 2, fontSize: detail.size, color: MUTE, whiteSpace: "nowrap", overflow: "hidden" }}>{detail.text}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div style={{ display: "flex", marginTop: 120, justifyContent: "center", fontSize: 44, color: MUTE }}>Nothing scheduled today.</div>
          )}
          {L.more > 0 ? (
            <div style={{ display: "flex", alignItems: "center", height: L.row, fontSize: L.title, fontWeight: 700, color: SOFT }}>
              {`And ${L.more} more. Ask the guard on duty.`}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", padding: `0 ${SIDE}px 36px`, fontSize: 24, color: MUTE }}>
          <div style={{ display: "flex" }}>ccfcentris.org.ph</div>
          <div style={{ display: "flex" }}>{SITE.addressLines.slice(0, 2).join(", ")}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="ccf-centris-${date}.png"`,
      },
    },
  );
}

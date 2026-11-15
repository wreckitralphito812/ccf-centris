import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { isDateKey } from "@/lib/admin-day";
import { fitLine, POSTER_LIST_HEIGHT, posterItems, posterScale, posterTimeLines } from "@/lib/day-poster";
import { WEEKDAY_NAMES } from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { getAdminEvents, getCourtRentals, getDgroupTableBookings, getReservations } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const INK = "#0d2b3a";
const SOFT = "#2b4654";
const MUTE = "#4d6878";
const TEAL = "#007a87";
const PAPER = "#f8fafb";


/**
 * The day poster as a 1080 × 1920 PNG (9:16, portrait), for the TV by the
 * guard's desk (Adrian, 2026-11-15): /admin/today/poster?d=2026-11-18. It
 * replaces the printed day sheet. Admins only: it names who has each room
 * and court, though never their phone numbers or emails (lib/day-poster).
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
  const items = posterItems({ date, events, rooms, rentals, tables });
  const s = posterScale(items.length);
  const shown = items.slice(0, items.length > s.max ? s.max - 1 : s.max);
  const more = items.length - shown.length;

  const day = new Date(`${date}T00:00:00Z`);
  const weekday = WEEKDAY_NAMES[day.getUTCDay()];
  const longDate = `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
  const logo = new URL("/logos/ccf-centris-horizontal.png", req.url).toString();
  // The width left for a row's text: the poster less the page margins, the row's padding and border, and the time column.
  const timeWidth = s.time * 5.6;
  const textWidth = 1080 - 56 * 2 - 28 * 2 - 4 - timeWidth - 20;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", height: 460, padding: "56px 72px 0", background: "#ffffff", borderBottom: `6px solid ${TEAL}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={290} height={121} alt="" />
          <div style={{ display: "flex", marginTop: 36, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: TEAL }}>TODAY AT CCF CENTRIS</div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 92, fontWeight: 800, color: INK, lineHeight: 1.05 }}>{weekday}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 52, fontWeight: 700, color: SOFT }}>{longDate}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", height: POSTER_LIST_HEIGHT, marginTop: 32, padding: "0 56px", overflow: "hidden" }}>
          {shown.length ? (
            shown.map((i) => {
              const [start, end] = posterTimeLines(i);
              const title = fitLine(i.title, s.title, textWidth, Math.round(s.title * 0.68));
              const sub = fitLine([i.where, i.who].filter(Boolean).join(" · "), s.sub, textWidth, Math.round(s.sub * 0.75));
              return (
                <div
                  key={i.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: s.row,
                    flexShrink: 0,
                    marginBottom: s.gap,
                    padding: "0 28px",
                    background: "#ffffff",
                    borderRadius: 18,
                    border: "2px solid #dbe5ea",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", width: timeWidth, flexShrink: 0 }}>
                    <div style={{ display: "flex", fontSize: s.time, fontWeight: 700, color: TEAL }}>{start}</div>
                    {end ? <div style={{ display: "flex", fontSize: Math.round(s.time * 0.72), color: MUTE }}>{end}</div> : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", marginLeft: 20, width: textWidth, overflow: "hidden" }}>
                    <div style={{ display: "flex", fontSize: title.size, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>{title.text}</div>
                    <div style={{ display: "flex", marginTop: 2, fontSize: sub.size, color: MUTE, whiteSpace: "nowrap", overflow: "hidden" }}>{sub.text}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: "flex", marginTop: 120, justifyContent: "center", fontSize: 44, color: MUTE }}>Nothing scheduled today.</div>
          )}
          {more > 0 ? (
            <div style={{ display: "flex", alignItems: "center", height: s.row, fontSize: s.title, fontWeight: 700, color: SOFT }}>
              {`And ${more} more. Ask the guard on duty.`}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", padding: "0 56px 40px", fontSize: 24, color: MUTE }}>
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

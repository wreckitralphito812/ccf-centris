import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const runtime = "edge";
export const alt = "CCF Centris, Christ's Commission Fellowship";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded social card for the site root. Deliberately typographic — no photo
 * to license — on CCF's paper/teal palette. Child routes inherit this unless
 * they export their own opengraph-image.
 *
 * Note: next/og (Satori) needs explicit `display: flex` on every element that
 * has more than one child.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#fdfaf4",
          color: "#201a12",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#007682",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fdfaf4",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            c
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#5b5443",
            }}
          >
            Christ&rsquo;s Commission Fellowship
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>
            CCF Centris
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#007682" }}>
            Sunday service, 10:00 AM
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#5b5443" }}>
          {`${SITE.url.replace(/^https?:\/\//, "")} · Eton Centris, EDSA cor. Quezon Ave.`}
        </div>
      </div>
    ),
    { ...size },
  );
}

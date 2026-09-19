import {
  DGROUP_POLICIES,
  nightLabel,
  roomName,
  slotLabel,
  tablesLabel,
} from "@/lib/dgroup-tables";
import { CONTACT, SITE } from "@/lib/site";

/**
 * The Dgroup booking emails: confirmed, changed, and cancelled.
 *
 * Minimal on purpose, in the spirit of a one-screen transactional email: the
 * logo, one headline, the table in large type, the floor plan with the table
 * highlighted, one button, then the policies and a quiet footer. Table-based
 * layout with inline styles, because that's what every mail client renders the
 * same way. Every image and link is absolute.
 */

export type BookingEmailKind = "confirmed" | "changed" | "cancelled";

export interface BookingEmailData {
  kind: BookingEmailKind;
  origin: string;
  leaderName: string;
  roomSlug: string;
  labels: string[];
  date: string;
  slotId: string;
  groupSize: number;
}

const TEAL = "#007682";
const INK = "#142021";
const SOFT = "#223032";
const MUTE = "#4d5c5e";
const GROUND = "#f4f7f7";
const FONT = "'Proxima Nova', Montserrat, 'Helvetica Neue', Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function bookingEmail(d: BookingEmailData): { subject: string; html: string; text: string } {
  const first = d.leaderName.split(" ")[0];
  const tables = tablesLabel(d.labels);
  const room = roomName(d.roomSlug);
  const when = `${nightLabel(d.date)}, ${slotLabel(d.slotId)}`;
  const manage = `${d.origin}/reserve/dgroup#your-tables`;
  const plan = `${d.origin}/api/dgroup-plan?room=${d.roomSlug}&t=${d.labels.join(",")}`;
  const cancelled = d.kind === "cancelled";

  const subject = {
    confirmed: `Your Dgroup table: ${tables}, ${room} · ${nightLabel(d.date)}`,
    changed: `Updated: ${tables}, ${room} · ${nightLabel(d.date)}`,
    cancelled: `Cancelled: your Dgroup table on ${nightLabel(d.date)}`,
  }[d.kind];

  const headline = {
    confirmed: `You're all set, ${first}.`,
    changed: `Your booking is updated, ${first}.`,
    cancelled: `Your booking is cancelled, ${first}.`,
  }[d.kind];

  const intro = {
    confirmed: "Your Dgroup has a table at CCF Centris. See you there!",
    changed: "Here are your new booking details. Your old table has been released.",
    cancelled: "Your table has been released for another Dgroup. You can book again anytime a slot is open.",
  }[d.kind];

  const row = (k: string, v: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #d3dfe1;font:600 11px/1.4 ${FONT};letter-spacing:2px;text-transform:uppercase;color:${MUTE};">${k}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #d3dfe1;font:400 15px/1.4 ${FONT};color:${INK};">${esc(v)}</td>
    </tr>`;

  const policies = DGROUP_POLICIES.map(
    (p) => `
    <tr>
      <td valign="top" style="padding:0 12px 12px 0;font:700 14px/1.5 ${FONT};color:${TEAL};">&bull;</td>
      <td style="padding:0 0 12px;font:400 14px/1.55 ${FONT};color:${SOFT};"><strong style="color:${INK};">${esc(p.title)}.</strong> ${esc(p.body)}</td>
    </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

  <tr><td align="center" style="padding:22px 24px;">
    <img src="${d.origin}/logos/ccf-centris-horizontal.png" width="120" alt="CCF Centris" style="display:block;height:auto;border:0;">
  </td></tr>

  <tr><td align="center" style="background:${GROUND};padding:44px 32px 40px;">
    <p style="margin:0;font:600 11px/1.4 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${TEAL};">Dgroup table ${cancelled ? "cancelled" : "reservation"}</p>
    <h1 style="margin:14px 0 0;font:500 30px/1.2 ${FONT};color:${TEAL};">${esc(headline)}</h1>
    <p style="margin:14px auto 0;max-width:420px;font:400 15px/1.6 ${FONT};color:${SOFT};">${esc(intro)}</p>
    ${
      cancelled
        ? ""
        : `<p style="margin:30px 0 0;font:700 40px/1.1 ${FONT};color:${INK};">${esc(tables)}</p>
    <p style="margin:6px 0 0;font:400 16px/1.4 ${FONT};color:${MUTE};">${esc(room)}</p>`
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;margin:26px auto 0;">
      ${row("When", when)}
      ${cancelled ? "" : row("Room", room)}
      ${row("Dgroup", `${d.groupSize} ${d.groupSize === 1 ? "person" : "people"}`)}
      ${row("Leader", d.leaderName)}
    </table>
    ${
      cancelled
        ? ""
        : `<img src="${plan}" width="420" alt="Floor plan of the ${esc(room)} with ${esc(tables.toLowerCase())} highlighted" style="display:block;width:100%;max-width:420px;height:auto;margin:30px auto 0;border:0;">`
    }
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 0;"><tr>
      <td style="background:${TEAL};border-radius:4px;">
        <a href="${manage}" style="display:inline-block;padding:14px 28px;font:700 13px/1 ${FONT};letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${cancelled ? "Book a table" : "Change or cancel"}</a>
      </td>
    </tr></table>
    ${
      cancelled
        ? ""
        : `<p style="margin:14px auto 0;max-width:420px;font:400 13px/1.5 ${FONT};color:${MUTE};">Need to change how many are coming, or move to another time? Sign in and update it from your booking, or cancel so another Dgroup can use the table.</p>`
    }
  </td></tr>

  ${
    cancelled
      ? ""
      : `<tr><td style="padding:36px 40px 24px;">
    <p style="margin:0 0 18px;text-align:center;font:700 12px/1.4 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${TEAL};">Before you come</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${policies}</table>
  </td></tr>`
  }

  <tr><td align="center" style="background:${GROUND};padding:28px 24px 34px;">
    <p style="margin:0;font:400 13px/1.7 ${FONT};color:${MUTE};">${esc(SITE.addressLines.join(", "))}</p>
    <p style="margin:4px 0 0;font:400 13px/1.7 ${FONT};color:${MUTE};">Questions? <a href="mailto:${CONTACT.messageEmail}" style="color:${MUTE};">${CONTACT.messageEmail}</a></p>
    <p style="margin:10px 0 0;font:400 12px/1.6 ${FONT};color:${MUTE};">You're receiving this because you booked a Dgroup table at <a href="${d.origin}" style="color:${MUTE};">CCF Centris</a>.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    headline,
    "",
    intro,
    "",
    ...(cancelled ? [] : [`${tables}, ${room}`]),
    `When: ${when}`,
    `Dgroup: ${d.groupSize}`,
    `Leader: ${d.leaderName}`,
    "",
    `${cancelled ? "Book again" : "Change or cancel"}: ${manage}`,
    ...(cancelled
      ? []
      : ["", "Before you come:", ...DGROUP_POLICIES.map((p) => `- ${p.title}. ${p.body}`)]),
    "",
    SITE.addressLines.join(", "),
    `Questions? ${CONTACT.messageEmail}`,
  ].join("\n");

  return { subject, html, text };
}

import { equipmentSummary, foodLabel, setupLabel } from "@/lib/ministry-rooms";
import { CONTACT, SITE } from "@/lib/site";

/**
 * Room request emails: the receipt the requester gets, the alert the admin
 * inbox gets, and the decision (approved, declined, cancelled) sent back.
 * Same look as the Dgroup booking emails: table layout, inline styles,
 * absolute links.
 */

export type RoomEmailKind = "received" | "admin" | "approved" | "rejected" | "cancelled";

export interface RoomEmailData {
  kind: RoomEmailKind;
  origin: string;
  reference: string;
  requester: string;
  requesterEmail: string;
  mobile: string | null;
  activity: string;
  ministry: string;
  rooms: string[];
  /** "Saturday, 3 October, 9:00 AM to 12 NN" */
  when: string;
  participants: number;
  setup: string | null;
  equipment: Record<string, number> | null;
  food: string | null;
  notes: string | null;
}

const TEAL = "#007682";
const INK = "#142021";
const SOFT = "#223032";
const MUTE = "#4d5c5e";
const GROUND = "#f4f7f7";
const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function roomRequestEmail(d: RoomEmailData): { subject: string; html: string; text: string } {
  const first = d.requester.split(" ")[0];
  const rooms = d.rooms.join(", ");

  const subject = {
    received: `Request received: ${d.activity}, ${d.when}`,
    admin: `New room request: ${rooms}, ${d.when} (${d.ministry})`,
    approved: `Confirmed: ${rooms} for ${d.activity}`,
    rejected: `Your room request for ${d.activity}`,
    cancelled: `Cancelled: ${rooms} for ${d.activity}`,
  }[d.kind];

  const eyebrow = {
    received: "Room request",
    admin: "New room request",
    approved: "Room confirmed",
    rejected: "Room request",
    cancelled: "Room cancelled",
  }[d.kind];

  const headline = {
    received: `Thanks, ${first}. We have your request.`,
    admin: `${d.ministry} is asking for ${rooms}.`,
    approved: `You're confirmed, ${first}.`,
    rejected: `We can't confirm this one, ${first}.`,
    cancelled: `Your booking is cancelled, ${first}.`,
  }[d.kind];

  const intro = {
    received:
      "The facilities team will check the calendar and email you when it's confirmed. The rooms are held for you while they look, but please wait for the confirmation before announcing it.",
    admin: "Approve or decline it on the admin page. The requester is emailed either way.",
    approved: "The rooms are yours for the time below. Please leave them as you found them.",
    rejected:
      "The rooms aren't available for this request. Reply to this email or write to us and we'll help you find another time or room.",
    cancelled: "These rooms have been released for other ministries.",
  }[d.kind];

  const button =
    d.kind === "admin"
      ? { href: `${d.origin}/admin/reservations`, label: "Review request" }
      : d.kind === "rejected" || d.kind === "cancelled"
        ? { href: `${d.origin}/centris/reserve`, label: "Request a room" }
        : { href: `${d.origin}/my/reservations`, label: "See my requests" };

  const rows: [string, string][] = [
    ["Reference", d.reference],
    ["Event", d.activity],
    ["Ministry", d.ministry],
    ["When", d.when],
    [d.rooms.length > 1 ? "Rooms" : "Room", rooms],
    ["People", String(d.participants)],
    ["Set-up", setupLabel(d.setup)],
  ];
  if (d.kind === "admin" || d.kind === "received") {
    rows.push(["Equipment", equipmentSummary(d.equipment)], ["Food", foodLabel(d.food)]);
    if (d.notes) rows.push(["Notes", d.notes]);
  }
  if (d.kind === "admin") {
    rows.push(["Requested by", d.requester], ["Email", d.requesterEmail]);
    if (d.mobile) rows.push(["Mobile", d.mobile]);
  }

  const row = (k: string, v: string) => `
    <tr>
      <td valign="top" style="padding:10px 16px 10px 0;border-bottom:1px solid #d3dfe1;font:600 11px/1.4 ${FONT};letter-spacing:2px;text-transform:uppercase;color:${MUTE};white-space:nowrap;">${k}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #d3dfe1;font:400 15px/1.4 ${FONT};color:${INK};">${esc(v)}</td>
    </tr>`;

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
    <p style="margin:0;font:600 11px/1.4 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${TEAL};">${eyebrow}</p>
    <h1 style="margin:14px 0 0;font:500 28px/1.25 ${FONT};color:${TEAL};">${esc(headline)}</h1>
    <p style="margin:14px auto 0;max-width:440px;font:400 15px/1.6 ${FONT};color:${SOFT};">${esc(intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;margin:26px auto 0;">
      ${rows.map(([k, v]) => row(k, v)).join("")}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 0;"><tr>
      <td style="background:${TEAL};border-radius:4px;">
        <a href="${button.href}" style="display:inline-block;padding:14px 28px;font:700 13px/1 ${FONT};letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${button.label}</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="background:${GROUND};padding:28px 24px 34px;border-top:1px solid #ffffff;">
    <p style="margin:0;font:400 13px/1.7 ${FONT};color:${MUTE};">${esc(SITE.addressLines.join(", "))}</p>
    <p style="margin:4px 0 0;font:400 13px/1.7 ${FONT};color:${MUTE};">Questions? <a href="mailto:${CONTACT.messageEmail}" style="color:${MUTE};">${CONTACT.messageEmail}</a></p>
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
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `${button.label}: ${button.href}`,
    "",
    `Questions? ${CONTACT.messageEmail}`,
  ].join("\n");

  return { subject, html, text };
}

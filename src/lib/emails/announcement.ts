import { CONTACT, SITE } from "@/lib/site";

/**
 * Emails for announcements (2026-10-05): to the admin inbox when something is
 * waiting or someone asks for access, and to the ministry rep when their
 * announcement is received, approved, sent back or declined. One plain
 * layout, matching the booking emails.
 */

const TEAL = "#007a87";
const INK = "#0d2b3a";
const SOFT = "#2b4654";
const MUTE = "#4d6878";
const GROUND = "#f4f7f8";
const FONT = "Manrope, 'Helvetica Neue', Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(d: {
  origin: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  note?: string | null;
  button?: { label: string; href: string };
}): { html: string; text: string } {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.headline)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
  <tr><td align="center" style="padding:22px 24px;"><img src="${d.origin}/logos/ccf-centris-horizontal.png" width="120" alt="CCF Centris" style="display:block;height:auto;border:0;"></td></tr>
  <tr><td style="background:${GROUND};padding:40px 36px;">
    <p style="margin:0;font:600 11px/1.4 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${TEAL};">${esc(d.eyebrow)}</p>
    <h1 style="margin:12px 0 0;font:700 26px/1.25 ${FONT};color:${INK};">${esc(d.headline)}</h1>
    ${d.paragraphs.map((p) => `<p style="margin:14px 0 0;font:400 15px/1.6 ${FONT};color:${SOFT};">${esc(p)}</p>`).join("")}
    ${d.note ? `<p style="margin:18px 0 0;padding:14px 16px;background:#ffffff;border-left:3px solid ${TEAL};font:400 15px/1.6 ${FONT};color:${INK};">${esc(d.note)}</p>` : ""}
    ${
      d.button
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr><td style="background:${TEAL};border-radius:8px;"><a href="${esc(d.button.href)}" style="display:inline-block;padding:14px 26px;font:700 15px/1 ${FONT};color:#ffffff;text-decoration:none;">${esc(d.button.label)}</a></td></tr></table>`
        : ""
    }
  </td></tr>
  <tr><td align="center" style="padding:24px;">
    <p style="margin:0;font:400 13px/1.7 ${FONT};color:${MUTE};">${esc(SITE.addressLines.join(", "))}</p>
    <p style="margin:4px 0 0;font:400 13px/1.7 ${FONT};color:${MUTE};">Questions? <a href="mailto:${CONTACT.messageEmail}" style="color:${MUTE};">${CONTACT.messageEmail}</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
  const text = [
    d.headline,
    "",
    ...d.paragraphs,
    ...(d.note ? ["", d.note] : []),
    ...(d.button ? ["", `${d.button.label}: ${d.button.href}`] : []),
  ].join("\n");
  return { html, text };
}

export type AnnouncementEmailKind = "received" | "approved" | "changes" | "declined";

/** To the ministry rep, about their own announcement. */
export function announcementEmail(d: {
  kind: AnnouncementEmailKind;
  origin: string;
  title: string;
  slug: string;
  note?: string | null;
}): { subject: string; html: string; text: string } {
  const copy = {
    received: {
      subject: `Received: ${d.title}`,
      headline: "We got your announcement.",
      paragraphs: [
        `Thank you for sending "${d.title}". The team will review it and email you within 2 working days.`,
        "You can still change it while it waits.",
      ],
      button: { label: "See your announcements", href: `${d.origin}/announce` },
    },
    approved: {
      subject: `Live on What's Happening: ${d.title}`,
      headline: "Your announcement is live.",
      paragraphs: [
        `"${d.title}" is now on What's Happening and the calendar. It comes down by itself after its last date.`,
      ],
      button: { label: "See it on the site", href: `${d.origin}/events/${d.slug}` },
    },
    changes: {
      subject: `Changes needed: ${d.title}`,
      headline: "A few changes, please.",
      paragraphs: [`"${d.title}" needs a few changes before it can go up. The note from the team:`],
      button: { label: "Make the changes", href: `${d.origin}/announce` },
    },
    declined: {
      subject: `Not posted: ${d.title}`,
      headline: "We couldn't post this one.",
      paragraphs: [`"${d.title}" won't be posted on What's Happening. The note from the team:`],
      button: { label: "See your announcements", href: `${d.origin}/announce` },
    },
  }[d.kind];
  return {
    subject: copy.subject,
    ...layout({ origin: d.origin, eyebrow: "What's Happening", headline: copy.headline, paragraphs: copy.paragraphs, note: d.note, button: copy.button }),
  };
}

/** To the admin inbox: something is waiting for review, or someone asks for access. */
export function adminAnnouncementEmail(d: {
  kind: "waiting" | "access";
  origin: string;
  title?: string;
  who: string;
  ministry?: string | null;
}): { subject: string; html: string; text: string } {
  if (d.kind === "access") {
    return {
      subject: `Announcement access request: ${d.who}`,
      ...layout({
        origin: d.origin,
        eyebrow: "Announcements",
        headline: "Someone asked to post announcements.",
        paragraphs: [`${d.who}${d.ministry ? ` (${d.ministry})` : ""} would like to post on What's Happening.`],
        button: { label: "Review in the admin console", href: `${d.origin}/admin/announcements?tab=reps` },
      }),
    };
  }
  return {
    subject: `Waiting for review: ${d.title}`,
    ...layout({
      origin: d.origin,
      eyebrow: "Announcements",
      headline: "An announcement is waiting for review.",
      paragraphs: [`"${d.title}" from ${d.who}${d.ministry ? ` (${d.ministry})` : ""}.`],
      button: { label: "Review it", href: `${d.origin}/admin/announcements` },
    }),
  };
}

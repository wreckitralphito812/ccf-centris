import { CONTACT, SITE } from "@/lib/site";

/**
 * "Confirm your email", sent by the site through Resend instead of by
 * Firebase (2026-10-03). Firebase won't let this project change its email
 * templates (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED), so its own email always
 * linked to ccf-centris-4ad56.firebaseapp.com. Ours comes from
 * noreply@ccfcentris.org.ph, looks like the booking emails, and links to
 * ccfcentris.org.ph, where next.config.ts serves Firebase's action page.
 */

const TEAL = "#007a87";
const INK = "#0d2b3a";
const SOFT = "#2b4654";
const MUTE = "#4d6878";
const GROUND = "#f4f7f8";
const FONT = "Manrope, 'Helvetica Neue', Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Firebase's action link, moved onto our own domain. Only the host changes;
 * the path (/__/auth/action) and every parameter (mode, oobCode, apiKey,
 * continueUrl) stay as Firebase made them. Anything that isn't a Firebase
 * action link comes back untouched.
 */
export function onOurDomain(link: string, origin: string): string {
  try {
    const url = new URL(link);
    if (!url.pathname.startsWith("/__/auth/action")) return link;
    const ours = new URL(origin);
    url.protocol = ours.protocol;
    url.host = ours.host;
    return url.toString();
  } catch {
    return link;
  }
}

export function verifyEmail(d: { origin: string; firstName: string | null; link: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const hello = d.firstName ? `Welcome, ${d.firstName}.` : "Welcome to CCF Centris.";
  const subject = "Confirm your email for CCF Centris";
  const intro =
    "Tap the button to confirm this is your email. Then sign in with your password to book tables and rooms and to pray on the Prayer Wall.";

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
    <p style="margin:0;font:600 11px/1.4 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${TEAL};">Your account</p>
    <h1 style="margin:14px 0 0;font:700 30px/1.2 ${FONT};color:${INK};">${esc(hello)}</h1>
    <p style="margin:14px auto 0;max-width:420px;font:400 15px/1.6 ${FONT};color:${SOFT};">${esc(intro)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px auto 0;"><tr>
      <td style="background:${TEAL};border-radius:8px;">
        <a href="${esc(d.link)}" style="display:inline-block;padding:15px 30px;font:700 15px/1 ${FONT};color:#ffffff;text-decoration:none;">Confirm my email</a>
      </td>
    </tr></table>
    <p style="margin:22px auto 0;max-width:420px;font:400 13px/1.6 ${FONT};color:${MUTE};">If the button doesn't work, copy this link into your browser:<br><a href="${esc(d.link)}" style="color:${TEAL};word-break:break-all;">${esc(d.link)}</a></p>
  </td></tr>

  <tr><td align="center" style="padding:28px 24px 34px;">
    <p style="margin:0;font:400 13px/1.7 ${FONT};color:${MUTE};">Didn't sign up? You can ignore this email.</p>
    <p style="margin:10px 0 0;font:400 13px/1.7 ${FONT};color:${MUTE};">${esc(SITE.addressLines.join(", "))}</p>
    <p style="margin:4px 0 0;font:400 13px/1.7 ${FONT};color:${MUTE};">Questions? <a href="mailto:${CONTACT.messageEmail}" style="color:${MUTE};">${CONTACT.messageEmail}</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    hello,
    "",
    intro,
    "",
    `Confirm my email: ${d.link}`,
    "",
    "Didn't sign up? You can ignore this email.",
    SITE.addressLines.join(", "),
    `Questions? ${CONTACT.messageEmail}`,
  ].join("\n");

  return { subject, html, text };
}

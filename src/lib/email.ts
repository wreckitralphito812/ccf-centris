import "server-only";

import { SITE } from "@/lib/site";

/**
 * Outgoing email, through Resend's HTTP API (no SDK: one POST is all it takes).
 *
 * Needs RESEND_API_KEY. EMAIL_FROM sets the sender once CCF Centris has its own
 * domain verified in Resend, e.g. "CCF Centris <reservations@ccfcentris.org>".
 * Until then it falls back to Resend's shared test sender, which only delivers
 * to the address that owns the Resend account.
 *
 * Never throws: a booking must not fail because an email didn't go out. The
 * caller gets { ok: false } and tells the member.
 */
export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("sendEmail: RESEND_API_KEY is not set; skipped", msg.subject);
    return { ok: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "CCF Centris <onboarding@resend.dev>",
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      console.error("sendEmail: Resend refused", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("sendEmail failed", e);
    return { ok: false };
  }
}

/**
 * The site's public origin, for links and images inside emails, which must be
 * absolute. NEXT_PUBLIC_SITE_URL when set, else the Vercel production domain.
 */
export function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return SITE.url;
}

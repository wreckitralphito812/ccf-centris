"use server";

import { firebaseAdminAuth, hasFirebase } from "@/lib/firebase/admin";
import { sendEmail, siteOrigin } from "@/lib/email";
import { onOurDomain, verifyEmail } from "@/lib/emails/verify-email";
import { safeNext } from "@/lib/prayer-wall";

/**
 * Send the "Confirm your email" message ourselves, through Resend, with the
 * link on ccfcentris.org.ph (2026-10-03). Firebase won't let this project
 * edit its templates, so its own email can only link to firebaseapp.com.
 *
 * Only the person who just signed up (or just signed in, unconfirmed) can ask:
 * the call needs their fresh Firebase ID token. Anyone else would need the
 * account's password, so this can't be used to mail arbitrary addresses.
 *
 * { ok: false } tells the browser to fall back to Firebase's own email, so a
 * sign-up never gets stuck because Resend or the service account is down.
 */
export async function sendVerifyEmail(idToken: string, next: string): Promise<{ ok: boolean }> {
  if (!hasFirebase() || typeof idToken !== "string" || !idToken) return { ok: false };
  try {
    const auth = await firebaseAdminAuth();
    const user = await auth.verifyIdToken(idToken);
    if (!user.email) return { ok: false };
    if (user.email_verified) return { ok: true };

    const origin = siteOrigin();
    const continueUrl = `${origin}${safeNext(next, "/sign-in?verified=1")}`;
    const link = await auth.generateEmailVerificationLink(user.email, { url: continueUrl });
    const firstName = typeof user.name === "string" ? user.name.trim().split(/\s+/)[0] || null : null;

    return await sendEmail({
      to: user.email,
      ...verifyEmail({ origin, firstName, link: onOurDomain(link, origin) }),
    });
  } catch (e) {
    console.error("sendVerifyEmail failed", e);
    return { ok: false };
  }
}

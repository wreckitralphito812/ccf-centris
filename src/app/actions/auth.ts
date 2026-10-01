"use server";

import { cookies } from "next/headers";

import { hasAccounts, SESSION_COOKIE, SESSION_MAX_AGE_S } from "@/lib/auth/session";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { cleanName, isDisposableEmail, nameProblem } from "@/lib/member";
import { safeNext } from "@/lib/prayer-wall";
import { normalizePhMobile, phMobileProblem } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Member sign-in, with Firebase Auth proving identity.
 *
 * The browser signs in with Firebase (email and password, or Google; the
 * emailed sign-in link was retired on 2026-09-30), then hands
 * the resulting ID token to `startSession`. That checks the token, finds or
 * creates the member's profile, and swaps the token for an httpOnly Firebase
 * session cookie, which is all the site trusts from then on.
 */

export interface AuthResult {
  ok: boolean;
  formError?: string;
}

export interface EmailCheck extends AuthResult {
  email?: string;
  phone?: string | null;
}

const EMAIL = /.+@.+\..+/;
const UNAVAILABLE = "Accounts aren't available in this environment yet.";
const DISPOSABLE =
  "Please use an email address you'll keep. We use it for your bookings and to reach you.";

export interface SignUpCheck extends AuthResult {
  email?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "email" | "mobile", string>>;
}

/**
 * Vet the sign-up form before the browser asks Firebase to create the
 * account: a real name and a lasting email. `startSession` checks the email
 * again, which is what actually enforces it, since anyone can call Firebase
 * directly.
 */
export async function checkSignUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
}): Promise<SignUpCheck> {
  if (!hasAccounts()) return { ok: false, formError: UNAVAILABLE };

  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  const email = String(input.email ?? "").trim().toLowerCase();
  const fieldErrors: SignUpCheck["fieldErrors"] = {};
  const f = nameProblem(firstName, "first name");
  const l = nameProblem(lastName, "surname");
  if (f) fieldErrors.firstName = f;
  if (l) fieldErrors.lastName = l;
  if (!EMAIL.test(email)) fieldErrors.email = "Enter a valid email address.";
  else if (isDisposableEmail(email)) fieldErrors.email = DISPOSABLE;
  const m = phMobileProblem(input.mobile);
  if (m) fieldErrors.mobile = m;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return { ok: true, email, firstName, lastName, mobile: normalizePhMobile(input.mobile)! };
}

export interface SessionStart {
  idToken: string;
  next?: string;
  /** Optional mobile, first sign-up only. */
  phone?: string | null;
  /** "Remember me": keep the session after the browser closes (default true). */
  remember?: boolean;
  /** Google's given and family names, to prefill the setup step. */
  firstName?: string | null;
  lastName?: string | null;
}

/** Start a site session from a fresh Firebase ID token. Returns where to go next. */
export async function startSession(
  input: SessionStart,
): Promise<AuthResult & { redirectTo?: string }> {
  if (!hasAccounts()) return { ok: false, formError: UNAVAILABLE };

  let auth;
  let token;
  try {
    auth = await firebaseAdminAuth();
    token = await auth.verifyIdToken(String(input.idToken ?? ""), true);
  } catch (e) {
    console.error("startSession: ID token rejected", e);
    return { ok: false, formError: "That sign-in didn't go through. Please try again." };
  }

  // Only a sign-in that just happened can start a session.
  if (Date.now() / 1000 - token.auth_time > 5 * 60) {
    return { ok: false, formError: "That sign-in has expired. Please try again." };
  }
  const email = token.email?.trim().toLowerCase();
  if (!email || token.email_verified !== true) {
    return { ok: false, formError: "We need a verified email address to sign you in." };
  }
  if (isDisposableEmail(email)) return { ok: false, formError: DISPOSABLE };

  const first = cleanName(input.firstName);
  const last = cleanName(input.lastName);

  const db = supabaseAdmin();
  const { data: memberId, error } = await db.rpc("link_firebase_member", {
    p_uid: token.uid,
    p_email: email,
    p_full_name: cleanName(token.name) || null,
    p_first: first && !nameProblem(first, "first name") ? first : null,
    p_last: last && !nameProblem(last, "surname") ? last : null,
    p_avatar: typeof token.picture === "string" ? token.picture : null,
    p_mobile: normalizePhMobile(String(input.phone ?? "")),
  });
  if (error || typeof memberId !== "string") {
    console.error("startSession: link_firebase_member failed", error);
    return { ok: false, formError: "Something went wrong on our end. Try again in a moment." };
  }

  let session: string;
  try {
    session = await auth.createSessionCookie(String(input.idToken), {
      expiresIn: SESSION_MAX_AGE_S * 1000,
    });
  } catch (e) {
    console.error("startSession: createSessionCookie failed", e);
    return { ok: false, formError: "Something went wrong on our end. Try again in a moment." };
  }

  // Without "Remember me" the cookie has no max-age, so the browser drops it
  // when it closes; the session itself still ends after SESSION_MAX_AGE_S.
  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(input.remember === false ? {} : { maxAge: SESSION_MAX_AGE_S }),
  });

  // First sign-in (or anything missing): ask for first name, surname and a
  // mobile number before going on (the screen name moved to the Prayer Wall).
  const next = safeNext(input.next, "/my/reservations");
  const { data: profile } = await db
    .from("profiles")
    .select("first_name, last_name, mobile")
    .eq("id", memberId)
    .maybeSingle();
  const incomplete = !profile?.first_name || !profile?.last_name || !profile?.mobile;
  return {
    ok: true,
    redirectTo: incomplete ? `/my/setup?next=${encodeURIComponent(next)}` : next,
  };
}

/** End the site session. The caller reloads the page. */
export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { sendVerifyEmail } from "@/app/actions/verify-email";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { startSession } from "@/app/actions/auth";
import { FormNote, IconField, OrDivider, PasswordField, submitClass } from "@/components/auth-fields";
import { authErrorMessage } from "@/lib/auth/password";
import { forgetSignUp, recallSignUp } from "@/lib/auth/pending-profile";
import { firebaseAuth } from "@/lib/firebase/client";
import { ProviderButton } from "./provider-button";

/**
 * Email and password sign-in, then Google (2026-09-30, after the Uiverse form
 * Ralph chose). Firebase checks the password; the ID token then goes to
 * `startSession`, which sets the site's own session cookie.
 *
 * An account whose email isn't confirmed yet can't start a session (bookings
 * are emailed there), so we say so and offer to resend the confirmation.
 */
export function SignInForm({ next, accounts }: { next: string; accounts: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<User | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setNote(null);
    if (!accounts) return setError("Accounts aren’t available yet. Check back soon.");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setPending(true);
    try {
      const auth = await firebaseAuth();
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!user.emailVerified) {
        setUnverified(user);
        setPending(false);
        return;
      }
      // Name and mobile from the sign-up form, if it was in this browser.
      const pending = recallSignUp(user.email ?? email.trim());
      const res = await startSession({
        idToken: await user.getIdToken(),
        next,
        remember,
        firstName: pending?.firstName ?? null,
        lastName: pending?.lastName ?? null,
        phone: pending?.mobile ?? null,
      });
      if (res.ok) forgetSignUp(user.email ?? email.trim());
      await signOut(auth);
      if (!res.ok || !res.redirectTo) {
        setError(res.formError ?? "Could not sign you in. Please try again.");
        setPending(false);
        return;
      }
      // A full load, so the header and every server-rendered part see the new session.
      window.location.assign(res.redirectTo);
    } catch (e) {
      setPending(false);
      setError(authErrorMessage(e instanceof FirebaseError ? e.code : ""));
    }
  }

  async function resend() {
    if (!unverified) return;
    try {
      const sent = await sendVerifyEmail(await unverified.getIdToken(true), "/sign-in?verified=1").catch(() => ({ ok: false }));
      if (!sent.ok) await sendEmailVerification(unverified, { url: `${window.location.origin}/sign-in?verified=1` });
      setNote(`We’ve sent a new confirmation email to ${unverified.email}.`);
    } catch (e) {
      setError(authErrorMessage(e instanceof FirebaseError ? e.code : ""));
    }
  }

  async function forgot() {
    setError(null);
    setNote(null);
    if (!accounts) return setError("Accounts aren’t available yet. Check back soon.");
    if (!email.trim()) return setError("Enter your email above, then tap “Forgot password?” again.");
    try {
      await sendPasswordResetEmail(await firebaseAuth(), email.trim(), {
        url: `${window.location.origin}/sign-in`,
      });
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : "";
      // Don't reveal whether an account exists; only real problems show.
      if (code !== "auth/user-not-found" && code !== "auth/invalid-email") {
        return setError(authErrorMessage(code));
      }
    }
    setNote(`If ${email.trim()} has an account, we’ve emailed a link to set a new password.`);
  }

  if (unverified) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-[1.3rem] font-semibold text-ink">Confirm your email first</p>
        <p className="text-[1rem] leading-relaxed text-ink-mute">
          We sent a confirmation link to <span className="font-semibold text-ink">{unverified.email}</span>. Tap it,
          then come back and sign in.
        </p>
        {note ? <FormNote tone="ok">{note}</FormNote> : null}
        {error ? <FormNote>{error}</FormNote> : null}
        <div className="flex flex-col gap-3">
          <button type="button" onClick={resend} className={submitClass}>
            Send the email again
          </button>
          <button
            type="button"
            onClick={() => {
              setUnverified(null);
              setNote(null);
            }}
            className="min-h-11 shrink-0 text-[0.95rem] font-medium text-clay hover:underline"
          >
            I’ve confirmed it, sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Google first (2026-10-10): below the form it sat under the fold on
          phones, and people missed it. */}
      {accounts ? (
        <>
          <ProviderButton next={next} remember={remember} />
          <OrDivider>or with email</OrDivider>
        </>
      ) : null}
      <form noValidate onSubmit={submit} className="space-y-5">
        <IconField
          id="email"
          label="Email"
          icon="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.95rem] text-ink-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(ev) => setRemember(ev.target.checked)}
              className="h-5 w-5 rounded-md accent-clay"
            />
            Remember me
          </label>
          <button type="button" onClick={forgot} className="min-h-11 shrink-0 text-[0.95rem] font-medium text-clay hover:underline">
            Forgot password?
          </button>
        </div>
        {note ? <FormNote tone="ok">{note}</FormNote> : null}
        {error ? <FormNote>{error}</FormNote> : null}
        <button type="submit" disabled={pending} className={submitClass}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[0.95rem] text-ink-mute">
        Don&rsquo;t have an account?{" "}
        <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="font-medium text-clay hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

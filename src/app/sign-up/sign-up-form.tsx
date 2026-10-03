"use client";

import Link from "next/link";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { sendVerifyEmail } from "@/app/actions/verify-email";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import { checkSignUp, type SignUpCheck } from "@/app/actions/auth";
import { FormNote, IconField, OrDivider, PasswordField, PhoneField, submitClass } from "@/components/auth-fields";
import { rememberSignUp } from "@/lib/auth/pending-profile";
import { authErrorMessage, passwordProblem, PASSWORD_MIN } from "@/lib/auth/password";
import { firebaseAuth } from "@/lib/firebase/client";
import { ProviderButton } from "@/app/sign-in/provider-button";

/**
 * Create an account with a name, email and password (2026-09-30). The server
 * checks the name and email first; Firebase then creates the account and
 * emails a confirmation link. The site only starts a session for a confirmed
 * email, since bookings are sent there, so the person confirms and then signs
 * in. Their name is kept on the Firebase account and saved to their profile at
 * that first sign-in.
 */
export function SignUpForm({ next, accounts }: { next: string; accounts: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<SignUpCheck["fieldErrors"] & { password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (!accounts) return setFormError("Accounts aren’t available yet. Check back soon.");

    const pw = passwordProblem(password);
    const check = await checkSignUp({ firstName, lastName, email, mobile });
    const fieldErrors = { ...(check.fieldErrors ?? {}), ...(pw ? { password: pw } : {}) };
    setErrors(fieldErrors);
    if (!check.ok || pw) {
      if (check.formError) setFormError(check.formError);
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    setPending(true);
    try {
      const auth = await firebaseAuth();
      const { user } = await createUserWithEmailAndPassword(auth, check.email!, password);
      await updateProfile(user, { displayName: `${check.firstName} ${check.lastName}` });
      // Our own email, linking to ccfcentris.org.ph; Firebase's if ours can't go.
      const back = `/sign-in?verified=1&next=${encodeURIComponent(next)}`;
      const sent = await sendVerifyEmail(await user.getIdToken(true), back).catch(() => ({ ok: false }));
      if (!sent.ok) await sendEmailVerification(user, { url: `${window.location.origin}${back}` });
      await signOut(auth);
      // Kept in this browser until the first sign-in saves it to the profile.
      rememberSignUp(check.email!, { firstName: check.firstName!, lastName: check.lastName!, mobile: check.mobile! });
      setSentTo(check.email!);
    } catch (e) {
      setFormError(authErrorMessage(e instanceof FirebaseError ? e.code : ""));
    }
    setPending(false);
  }

  if (sentTo) {
    return (
      <div className="space-y-5 text-center">
        <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-clay-wash text-clay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M3.5 6.5 12 13l8.5-6.5" />
          </svg>
        </span>
        <p className="text-[1.3rem] font-semibold text-ink">Check your email</p>
        <p className="text-[1rem] leading-relaxed text-ink-mute">
          We sent a confirmation link to <span className="font-semibold text-ink">{sentTo}</span>. Tap it to confirm
          your email, then sign in with your password.
        </p>
        <p className="text-[0.92rem] text-ink-mute">Don&rsquo;t see it? Check your spam or promotions folder.</p>
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={`${submitClass} inline-block`}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <form noValidate onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <IconField
            id="first_name"
            label="First name"
            icon="person"
            autoComplete="given-name"
            maxLength={60}
            value={firstName}
            onChange={(ev) => setFirstName(ev.target.value)}
            error={errors.firstName}
          />
          <IconField
            id="last_name"
            label="Surname"
            icon="person"
            autoComplete="family-name"
            maxLength={60}
            value={lastName}
            onChange={(ev) => setLastName(ev.target.value)}
            error={errors.lastName}
          />
        </div>
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
          error={errors.email}
        />
        <PhoneField
          id="mobile"
          label="Mobile number"
          value={mobile}
          onValue={setMobile}
          error={errors.mobile}
          hint="For bookings and same-day changes."
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters, with a letter and a number.`}
        />
        {formError ? <FormNote>{formError}</FormNote> : null}
        <button type="submit" disabled={pending} className={submitClass}>
          {pending ? "Creating your account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-[0.95rem] text-ink-mute">
        Already have an account?{" "}
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-clay hover:underline">
          Sign in
        </Link>
      </p>

      {accounts ? (
        <>
          <OrDivider />
          <ProviderButton next={next} />
        </>
      ) : null}
    </div>
  );
}

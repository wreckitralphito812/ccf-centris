"use client";

import { getAdditionalUserInfo, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useState } from "react";

import { Button } from "@/components/ui";
import { startSession } from "@/app/actions/auth";
import { firebaseAuth } from "@/lib/firebase/client";

/**
 * One-click sign-in with Google, through Firebase. A popup rather than a
 * redirect: it doesn't depend on the browser sharing storage with the
 * firebaseapp.com auth domain, which Safari and others now block.
 *
 * Firebase's ID token then goes to `startSession`, which sets the site's own
 * session cookie; the browser keeps no Firebase session.
 */
export function ProviderButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const auth = await firebaseAuth();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const profile = (getAdditionalUserInfo(result)?.profile ?? {}) as Record<string, unknown>;
      const res = await startSession({
        idToken: await result.user.getIdToken(),
        next,
        firstName: typeof profile.given_name === "string" ? profile.given_name : null,
        lastName: typeof profile.family_name === "string" ? profile.family_name : null,
      });
      await signOut(auth);
      if (!res.ok || !res.redirectTo) {
        setError(res.formError ?? "Could not sign you in. Try again, or use email below.");
        setPending(false);
        return;
      }
      // A full load, so the header and every server-rendered part see the new session.
      window.location.assign(res.redirectTo);
    } catch (e) {
      setPending(false);
      const code = e instanceof FirebaseError ? e.code : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("Google sign-in failed", e);
      setError(
        code === "auth/popup-blocked"
          ? "Your browser blocked the Google window. Allow pop-ups for this site, or use email below."
          : "Could not start Google sign-in. Try again, or use email below.",
      );
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        tone="outline"
        size="lg"
        full
        disabled={pending}
        onClick={signIn}
      >
        <GoogleGlyph className="h-4 w-4" />
        {pending ? "Signing in…" : "Continue with Google"}
      </Button>
    </div>
  );
}

/** Google's four-colour "G". Fixed brand colours, so not a `currentColor` icon. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

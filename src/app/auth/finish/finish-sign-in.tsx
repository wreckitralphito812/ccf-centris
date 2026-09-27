"use client";

import { isSignInWithEmailLink, signInWithEmailLink, signOut } from "firebase/auth";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { Field, controlClass } from "@/components/form";
import { startSession } from "@/app/actions/auth";
import {
  clearPendingSignIn,
  firebaseAuth,
  readPendingSignIn,
  type PendingSignIn,
} from "@/lib/firebase/client";

type Status = "working" | "need-email" | "error";

export function FinishSignIn({ next }: { next: string }) {
  const [status, setStatus] = useState<Status>("working");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function complete(pending: PendingSignIn) {
    setStatus("working");
    const auth = await firebaseAuth();
    let idToken: string;
    try {
      const cred = await signInWithEmailLink(auth, pending.email, window.location.href);
      idToken = await cred.user.getIdToken();
    } catch (e) {
      console.error("signInWithEmailLink failed", e);
      // Wrong email typed on another device, or the link is spent or expired.
      window.location.replace(`/sign-in?error=link&next=${encodeURIComponent(next)}`);
      return;
    }

    const res = await startSession({ idToken, next, phone: pending.phone });
    await signOut(auth);
    if (!res.ok || !res.redirectTo) {
      setError(res.formError ?? "Could not sign you in. Try again in a moment.");
      setStatus("error");
      return;
    }
    clearPendingSignIn();
    // A full load, so the header and every server-rendered part see the new session.
    window.location.replace(res.redirectTo);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const auth = await firebaseAuth();
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        window.location.replace(`/sign-in?error=link&next=${encodeURIComponent(next)}`);
        return;
      }
      const pending = readPendingSignIn();
      if (pending) await complete(pending);
      else setStatus("need-email");
    })();
    // Runs once, for the link this page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "working") {
    return <p className="text-[0.95rem] text-ink-soft">One moment…</p>;
  }

  if (status === "error") {
    return (
      <div className="space-y-5">
        <p className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
          {error}
        </p>
        <a href={`/sign-in?next=${encodeURIComponent(next)}`} className="label text-clay underline">
          Back to sign in
        </a>
      </div>
    );
  }

  // Opened on a different device or browser: we need the address again.
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
        if (email) void complete({ email, phone: null });
      }}
    >
      <p className="text-[0.95rem] leading-relaxed text-ink-soft">
        This link was opened on a different device or browser from the one
        that asked for it. Confirm your email address to finish signing in.
      </p>
      <Field label="Email" name="email" required>
        {(p) => (
          <input {...p} type="email" inputMode="email" autoComplete="email" autoFocus className={controlClass} />
        )}
      </Field>
      <Button type="submit" size="lg" full>
        Sign in
      </Button>
    </form>
  );
}

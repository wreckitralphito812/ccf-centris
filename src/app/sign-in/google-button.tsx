"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * One-click sign-in via Supabase's Google OAuth provider. `signInWithOAuth`
 * does a full-page redirect to Google, so there's no success state to render —
 * only a pending state while the redirect is being set up, and an error line
 * if that call itself fails (network, provider misconfigured).
 *
 * The callback lands on `/auth/callback`, the same route the magic link uses;
 * it exchanges the `code` for a session and forwards to `next`.
 */
export function GoogleButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      console.error("Google sign-in failed", error);
      setError("Could not start Google sign-in — try again, or use email below.");
      setPending(false);
    }
    // On success the browser is already navigating away.
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
        {pending ? "Redirecting…" : "Continue with Google"}
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

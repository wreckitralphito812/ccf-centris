"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";

const CONFIGURED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Header account control. "Sign in" when signed out; the member's initial and
 * a small menu (My reservations / Sign out) when signed in. Renders nothing
 * when Supabase isn't configured, so the static build is unaffected.
 */
export function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!CONFIGURED) return;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!CONFIGURED || !ready) return null;

  if (!email) {
    return (
      <Link
        href="/sign-in"
        className="btn-press label hidden items-center border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright sm:inline-flex"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div
      className="relative hidden sm:block"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Account"
        className="btn-press grid h-10 w-10 place-items-center rounded-full border border-ink text-[0.8rem] font-semibold uppercase text-ink transition-colors hover:bg-ink hover:text-paper-bright"
      >
        {email[0]}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 border border-hairline bg-paper-bright p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-[0.8rem] text-ink-mute">{email}</p>
          <Link
            href="/my/reservations"
            className="block px-3 py-2 text-[0.9rem] text-ink-soft transition-colors hover:bg-bone hover:text-clay"
          >
            My reservations
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-[0.9rem] text-ink-soft transition-colors hover:bg-bone hover:text-clay"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

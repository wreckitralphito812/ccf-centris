"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/actions/auth";
import { FIREBASE_CONFIGURED } from "@/lib/firebase/client";

/**
 * Header account control. "Sign in" when signed out; the member's initial and
 * a small menu (My reservations / Sign out) when signed in. Renders nothing
 * when Firebase isn't configured, so the static build is unaffected.
 *
 * Asks `/auth/me` on each navigation, so a session started or ended in this
 * tab shows up without a reload.
 */
export function AccountMenu() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    let live = true;
    fetch("/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { email: null }))
      .then((body: { email: string | null }) => {
        if (!live) return;
        setEmail(body.email || null);
        setReady(true);
      })
      .catch(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [pathname]);

  if (!FIREBASE_CONFIGURED || !ready) return null;

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
          <form
            action={async () => {
              await signOut();
              // A full load, so every server-rendered part drops the session too.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/");
            }}
          >
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

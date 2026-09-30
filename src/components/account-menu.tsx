"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/actions/auth";
import { FIREBASE_CONFIGURED } from "@/lib/firebase/client";

/**
 * Who's signed in, from `/auth/me`, asked again on each navigation so a
 * session started or ended in this tab shows up without a reload. `ready` is
 * false until the answer is in (and always when Firebase isn't configured).
 */
export function useAccount() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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

  return { email, ready: FIREBASE_CONFIGURED && ready };
}

/**
 * Header account control. Signed out: "Sign in" and a Sign up button (Ralph
 * asked for sign-up to be easy to find, 2026-09-30). Signed in: the member's
 * initial and a small menu (My reservations / Sign out). Renders nothing when
 * Firebase isn't configured, so the static build is unaffected.
 */
export function AccountMenu() {
  const { email, ready } = useAccount();
  const [open, setOpen] = useState(false);

  if (!ready) return null;

  if (!email) {
    return (
      <div className="hidden items-center gap-1 sm:flex">
        <Link
          href="/sign-in"
          className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-ink transition-colors hover:bg-mist hover:text-clay"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="btn-press inline-flex items-center rounded-full bg-clay px-4 py-2.5 text-[0.92rem] font-semibold whitespace-nowrap text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)] transition-colors hover:bg-clay-deep"
        >
          Sign up
        </Link>
      </div>
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
        <div className="absolute right-0 top-full z-50 mt-1 w-56 surface p-1.5 shadow-lg">
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

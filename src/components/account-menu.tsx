"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

  if (!ready) return null;

  if (!email) {
    return (
      <div className="hidden shrink-0 items-center gap-1 sm:flex">
        <Link
          href="/sign-in"
          className="whitespace-nowrap rounded-lg px-3 py-2 text-[0.95rem] font-medium text-ink transition-colors hover:bg-mist hover:text-clay"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="btn-press inline-flex items-center rounded-lg bg-clay px-4 py-2.5 text-[0.92rem] font-semibold whitespace-nowrap text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)] transition-colors hover:bg-clay-deep"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return <SignedInMenu email={email} />;
}

/**
 * The signed-in menu. Opens on click (and on hover with a pointer), stays open
 * while the pointer crosses to it, and closes on a click elsewhere or Escape.
 * It used to vanish in the gap between the button and the menu (Ralph,
 * 2026-10-01).
 */
function SignedInMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (!box.current?.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hold = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const letGo = () => {
    hold();
    closeTimer.current = setTimeout(() => setOpen(false), 350);
  };

  const item =
    "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[0.95rem] text-ink transition-colors hover:bg-mist hover:text-clay";

  return (
    <div
      ref={box}
      className="relative hidden sm:block"
      onPointerEnter={(ev) => {
        if (ev.pointerType === "mouse") {
          hold();
          setOpen(true);
        }
      }}
      onPointerLeave={(ev) => {
        if (ev.pointerType === "mouse") letGo();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="btn-press grid h-10 w-10 place-items-center rounded-full bg-ink text-[0.85rem] font-semibold uppercase text-paper-bright transition-colors hover:bg-clay"
      >
        {email[0]}
      </button>

      {open ? (
        // pt-2 is a hover bridge: the pointer never leaves the box between
        // the button and the menu.
        <div className="absolute right-0 top-full z-50 w-64 pt-2">
          <div role="menu" className="rounded-2xl border border-rule bg-paper-bright p-2 shadow-[0_18px_40px_-12px_rgba(0,95,104,0.25)]">
            <p className="truncate px-3 pb-2 pt-1.5 text-[0.85rem] text-ink-mute">{email}</p>
            <Link href="/my/reservations" role="menuitem" className={item} onClick={() => setOpen(false)}>
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
              <button type="submit" role="menuitem" className={item}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

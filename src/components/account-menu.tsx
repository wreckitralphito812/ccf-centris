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
      // On phones only Sign up shows here (Sign in is in the menu), so the
      // way in is one tap from every page (2026-10-02).
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/sign-in"
          className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-[0.95rem] font-medium text-ink transition-colors hover:bg-mist hover:text-clay sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="btn-press inline-flex min-h-10 items-center rounded-lg bg-clay px-3.5 text-[0.9rem] font-semibold whitespace-nowrap text-paper-bright shadow-sm transition-colors hover:shadow-md hover:bg-clay-deep sm:px-4 sm:text-[0.92rem]"
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

/**
 * The account section at the foot of the phone menu, where the header's
 * account menu is hidden. Signed in, it also holds Sign out, which phones had
 * no way to reach before (2026-10-02).
 */
export function MobileAccount() {
  const { email, ready } = useAccount();
  if (!ready) return null;
  if (!email) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/sign-in"
          className="btn-press flex min-h-12 items-center justify-center rounded-lg border border-edge text-[1rem] font-semibold text-ink"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="btn-press flex min-h-12 items-center justify-center rounded-lg bg-clay text-[1rem] font-semibold text-paper-bright"
        >
          Sign up
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className="flex items-center gap-3 text-[0.95rem] text-ink-mute">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[0.85rem] font-semibold uppercase text-paper-bright">
          {email[0]}
        </span>
        <span className="truncate">{email}</span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/my/reservations"
          className="btn-press flex min-h-12 items-center justify-center rounded-lg bg-clay text-[1rem] font-semibold text-paper-bright"
        >
          My reservations
        </Link>
        <form
          action={async () => {
            await signOut();
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/");
          }}
        >
          <button
            type="submit"
            className="btn-press flex min-h-12 w-full items-center justify-center rounded-lg border border-edge text-[1rem] font-semibold text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

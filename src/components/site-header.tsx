"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/nav";
import { cx } from "./ui";
import { Wordmark } from "./wordmark";
import { AccountMenu } from "./account-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  const hoverOpen = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(label);
  };

  const hoverClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-hairline bg-paper/95 backdrop-blur-sm"
          : "border-transparent bg-paper",
      )}
      onMouseLeave={hoverClose}
    >
      <div className="mx-auto flex max-w-[110rem] items-center gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="CCF Centris home">
          <Wordmark />
        </Link>

        <nav
          aria-label="Main"
          className="ml-3 hidden items-center gap-0.5 lg:flex xl:ml-4 xl:gap-1"
        >
          {NAV.map((group) => (
            <div key={group.label} onMouseEnter={() => hoverOpen(group.label)}>
              <Link
                href={group.href}
                aria-expanded={open === group.label}
                onFocus={() => hoverOpen(group.label)}
                className={cx(
                  "label px-2.5 py-2 transition-colors xl:px-3",
                  isActive(group.href) ? "text-clay" : "text-ink hover:text-clay",
                )}
              >
                {group.label}
              </Link>
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="hidden h-10 w-10 place-items-center text-ink transition-colors hover:text-clay sm:grid"
          >
            <SearchIcon />
          </Link>
          <Link
            href="/watch/live"
            className="btn-press label hidden items-center gap-2 border border-clay bg-clay px-3.5 py-2 text-paper-bright transition-colors hover:bg-clay-deep md:inline-flex"
          >
            Watch live
          </Link>
          <Link
            href="/visit/service-times"
            className="btn-press label hidden items-center border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright sm:inline-flex"
          >
            Service times
          </Link>
          <AccountMenu />
          <button
            type="button"
            className="btn-press grid h-11 w-11 place-items-center lg:hidden"
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Desktop mega panel */}
      {open ? (
        <div
          className="absolute inset-x-0 top-full hidden border-y border-hairline bg-paper-bright shadow-[0_18px_40px_-28px_rgba(23,21,15,0.5)] lg:block"
          onMouseEnter={() => hoverOpen(open)}
          onMouseLeave={hoverClose}
        >
          <div className="mx-auto max-w-[110rem] px-8 py-6">
            {NAV.filter((g) => g.label === open).map((group) => (
              <div
                key={group.label}
                className="grid max-w-4xl gap-x-10 gap-y-4 md:grid-cols-[12rem_1fr]"
              >
                <div>
                  <p className="label text-clay">{group.label}</p>
                  <p className="font-display mt-2 text-lg leading-snug text-ink-soft">
                    {MENU_BLURB[group.label]}
                  </p>
                </div>
                <ul className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group flex flex-col border-b border-hairline py-1.5 transition-colors hover:border-ink"
                      >
                        <span className="text-[0.9rem] font-semibold text-ink transition-colors group-hover:text-clay">
                          {item.label}
                        </span>
                        {item.blurb ? (
                          <span className="mt-0.5 text-[0.78rem] leading-snug text-ink-mute">
                            {item.blurb}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Mobile sheet */}
      {mobile ? (
        <div className="fixed inset-x-0 bottom-0 top-[3.75rem] z-50 overflow-y-auto border-t border-hairline bg-paper lg:hidden">
          <div className="px-5 py-6">
            <div className="flex gap-2">
              <Link
                href="/watch/live"
                className="label flex-1 border border-clay bg-clay px-4 py-3 text-center text-paper-bright"
              >
                Watch live
              </Link>
              <Link
                href="/visit/service-times"
                className="label flex-1 border border-ink px-4 py-3 text-center text-ink"
              >
                Service times
              </Link>
            </div>

            <Link
              href="/search"
              className="mt-3 flex items-center gap-2 border border-hairline bg-paper-bright px-4 py-3 text-[0.9rem] text-ink-mute"
            >
              <SearchIcon />
              Search CCF Centris
            </Link>

            <nav aria-label="Mobile" className="mt-6">
              {NAV.map((group) => (
                <details key={group.label} className="border-b border-hairline">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4">
                    <span className="font-display text-2xl">{group.label}</span>
                    <ChevronIcon />
                  </summary>
                  <ul className="pb-4">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block py-2.5 text-[0.95rem] text-ink-soft"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}

const MENU_BLURB: Record<string, string> = {
  Visit: "Everything you need for your first Sunday.",
  Watch: "Join the service live, or watch on your own time.",
  Connect: "Find your people — Dgroups, communities, and a team to serve on.",
  Grow: "Grow in the Word — the journey, classes, and resources.",
  Centris: "The center and the life that fills it.",
};

/* --- Icons. Inline so nothing blocks first paint. --- */

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

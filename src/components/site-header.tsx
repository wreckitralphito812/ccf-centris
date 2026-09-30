"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/nav";
import { cx } from "./ui";
import { Wordmark } from "./wordmark";
import { AccountMenu, useAccount } from "./account-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);

  useEffect(() => {
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* The mobile sheet hangs below the bar, and the bar's height is not a
     constant: the wordmark steps up at xl, and the row rewraps at narrow
     widths. It used to be hard-coded at 3.75rem, which is shorter than the
     bar actually is — the sheet started underneath the header and its first
     buttons sat behind it. Measure instead. */
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const measure = () => setBarH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-rule bg-paper-bright/95 backdrop-blur-sm"
          : "border-transparent bg-paper-bright",
      )}
    >
      <div
        ref={bar}
        className="mx-auto flex max-w-[110rem] items-center gap-4 px-5 py-3.5 sm:px-8"
      >
        {/* Home, from every page — the thing people reach for first when they
            are lost. It dips and fades on press like every other control on
            the site, so it reads as something you can tap rather than a
            decoration that happens to be clickable. */}
        <Link
          href="/"
          aria-label="CCF Centris home"
          aria-current={pathname === "/" ? "page" : undefined}
          className="btn-press shrink-0 transition-opacity duration-200 hover:opacity-70"
        >
          <Wordmark />
        </Link>

        <nav
          aria-label="Main"
          className="ml-3 hidden items-center gap-0.5 lg:flex xl:ml-4 xl:gap-1"
        >
          {/* Every group is a plain link to its own href — no hover panel.
              A few groups (Visit, What's Happening) used to open a mega
              panel on hover for their sub-pages while the rest were plain
              links, which read as inconsistent: some nav items did
              something on hover and some didn't. New here, Getting here,
              Events, and Calendar are all still one click away from their
              own parent page and from the footer. */}
          {NAV.map((group) => (
            <Link
              key={group.label}
              href={group.href}
              aria-current={isActive(group.href) ? "page" : undefined}
              className={cx(
                // Sentence case, not tracked capitals: the calm look (2026-09-30).
                "relative whitespace-nowrap rounded-full px-2.5 py-2 text-[0.95rem] font-medium transition-colors xl:px-3.5",
                isActive(group.href) ? "text-clay" : "text-ink hover:bg-mist hover:text-clay",
              )}
            >
              {group.label}
              {isActive(group.href) ? (
                <span aria-hidden className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-clay" />
              ) : null}
            </Link>
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
            href="/watch"
            className="btn-press hidden items-center gap-2 rounded-full border border-clay px-4 py-2 text-[0.92rem] font-semibold whitespace-nowrap text-clay transition-colors hover:bg-clay-wash md:inline-flex lg:hidden xl:inline-flex"
          >
            Last Sunday
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

      {/* Mobile sheet */}
      {mobile ? (
        <div
          style={{ top: barH || undefined }}
          className="fixed inset-x-0 bottom-0 top-[3.75rem] z-50 overflow-y-auto overscroll-contain border-t border-rule bg-paper-bright lg:hidden"
        >
          <div className="px-5 py-6">
            <div className="flex gap-2">
              <Link
                href="/watch"
                className="btn-press flex-1 rounded-full bg-clay px-4 py-3.5 text-center text-[1rem] font-semibold text-paper-bright"
              >
                Last Sunday
              </Link>
              <Link
                href="/visit#getting-here"
                className="btn-press flex-1 rounded-full border border-clay px-4 py-3.5 text-center text-[1rem] font-semibold text-clay"
              >
                Getting here
              </Link>
            </div>

            <SheetAccount />

            <Link
              href="/search"
              className="mt-3 flex items-center gap-2 rounded-[0.875rem] bg-mist px-4 py-3.5 text-[0.95rem] text-ink-mute"
            >
              <SearchIcon />
              Search CCF Centris
            </Link>

            <nav aria-label="Mobile" className="mt-6">
              {NAV.map((group) =>
                group.items.length === 0 ? (
                  <Link
                    key={group.label}
                    href={group.href}
                    className="flex items-center justify-between border-b border-rule py-4"
                  >
                    <span className="text-[1.35rem] font-semibold tracking-[-0.01em]">{group.label}</span>
                  </Link>
                ) : (
                  <details key={group.label} className="border-b border-rule">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-4">
                      <span className="text-[1.35rem] font-semibold tracking-[-0.01em]">{group.label}</span>
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
                ),
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}

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

/** Sign up and Sign in in the phone menu, where the header control is hidden. */
function SheetAccount() {
  const { email, ready } = useAccount();
  if (!ready) return null;
  if (email) {
    return (
      <Link
        href="/my/reservations"
        className="btn-press mt-3 flex items-center justify-center rounded-full border border-clay px-4 py-3.5 text-[1rem] font-semibold text-clay"
      >
        My reservations
      </Link>
    );
  }
  return (
    <div className="mt-3 flex gap-2">
      <Link
        href="/sign-up"
        className="btn-press flex-1 rounded-full bg-clay px-4 py-3.5 text-center text-[1rem] font-semibold text-paper-bright"
      >
        Sign up
      </Link>
      <Link
        href="/sign-in"
        className="btn-press flex-1 rounded-full border border-edge px-4 py-3.5 text-center text-[1rem] font-semibold text-ink"
      >
        Sign in
      </Link>
    </div>
  );
}

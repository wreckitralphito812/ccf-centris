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
          ? "border-hairline bg-paper/95 backdrop-blur-sm"
          : "border-transparent bg-paper",
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
              className={cx(
                "label whitespace-nowrap px-2 py-2 transition-colors xl:px-3",
                isActive(group.href) ? "text-clay" : "text-ink hover:text-clay",
              )}
            >
              {group.label}
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
            className="btn-press label hidden items-center gap-2 border border-clay bg-clay px-3.5 py-2 whitespace-nowrap text-paper-bright transition-colors hover:bg-clay-deep md:inline-flex lg:hidden xl:inline-flex"
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
          className="fixed inset-x-0 bottom-0 top-[3.75rem] z-50 overflow-y-auto overscroll-contain border-t border-hairline bg-paper lg:hidden"
        >
          <div className="px-5 py-6">
            <div className="flex gap-2">
              <Link
                href="/watch"
                className="label flex-1 border border-clay bg-clay px-4 py-3 text-center text-paper-bright"
              >
                Last Sunday
              </Link>
              <Link
                href="/visit#getting-here"
                className="label flex-1 border border-ink px-4 py-3 text-center text-ink"
              >
                Getting here
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
              {NAV.map((group) =>
                group.items.length === 0 ? (
                  <Link
                    key={group.label}
                    href={group.href}
                    className="flex items-center justify-between border-b border-hairline py-4"
                  >
                    <span className="font-display text-2xl">{group.label}</span>
                  </Link>
                ) : (
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

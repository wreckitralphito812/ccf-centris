"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/nav";
import { cx } from "./ui";
import { Wordmark } from "./wordmark";
import { AccountMenu, MobileAccount } from "./account-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);

  // Close the phone menu when the page changes, while rendering rather than
  // in an effect (no extra render pass; React's recommended pattern).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMobile(false);
  }

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
    <>
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
          onClick={(ev) => {
            // Already home: a link to the same page does nothing, so take
            // people back to the top instead (Ralph, 2026-10-10).
            if (pathname === "/") {
              ev.preventDefault();
              setMobile(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
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
                "relative whitespace-nowrap rounded-lg px-2 py-2 text-[0.95rem] transition-colors xl:px-3.5",
                isActive(group.href) ? "bg-clay-wash font-semibold text-clay" : "font-medium text-ink hover:bg-mist hover:text-clay",
              )}
            >
              {group.label}
              {isActive(group.href) ? (
                <span aria-hidden className="absolute bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-clay" />
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
            className="btn-press hidden items-center gap-2 rounded-lg border border-clay px-4 py-2 text-[0.92rem] font-semibold whitespace-nowrap text-clay transition-colors hover:bg-clay-wash md:inline-flex lg:hidden 2xl:inline-flex"
          >
            Last Sunday
          </Link>
          {/* The open phone menu has its own account section at the foot. */}
          <div className={cx(mobile && "max-lg:hidden")}>
            <AccountMenu />
          </div>
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

    </header>

      {/* Mobile sheet. Outside the header on purpose: once scrolled, the
          header's backdrop-blur makes it the containing block for anything
          `fixed` inside it, so the sheet shrank to the header's height and
          only opened at the top of the page (Ralph, 2026-10-10). */}
      {mobile ? (
        <div
          style={{ top: barH || undefined }}
          // Any link closes the sheet, including one to the page you're on,
          // which doesn't change the path, so the sheet used to stay open and
          // the tap seemed to do nothing (2026-10-10).
          onClick={(ev) => {
            if ((ev.target as HTMLElement).closest("a")) setMobile(false);
          }}
          className="fixed inset-x-0 bottom-0 top-[3.75rem] z-50 overflow-y-auto overscroll-contain border-t border-rule bg-paper-bright lg:hidden"
        >
          {/* The phone menu (2026-10-02): search, the pages, then your
              account. Ralph found the four buttons that used to sit on top
              (Last Sunday, Getting here, Sign up, Sign in) cluttered; Watch
              and Visit cover the first two, and the account is at the foot. */}
          <div className="flex min-h-full flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
            <Link
              href="/search"
              className="flex min-h-12 items-center gap-2.5 rounded-lg bg-mist px-4 text-[1rem] text-ink-mute"
            >
              <SearchIcon />
              Search CCF Centris
            </Link>

            <nav aria-label="Mobile" className="mt-4">
              {NAV.map((group) =>
                group.items.length === 0 ? (
                  <Link
                    key={group.label}
                    href={group.href}
                    aria-current={isActive(group.href) ? "page" : undefined}
                    className={cx(
                      "flex min-h-14 items-center justify-between border-b border-rule",
                      isActive(group.href) ? "rounded-lg bg-clay-wash px-3 text-clay" : "text-ink",
                    )}
                  >
                    <span className="text-[1.15rem] font-semibold tracking-[-0.01em]">{group.label}</span>
                    <ChevronIcon dir="right" />
                  </Link>
                ) : (
                  <details key={group.label} className="group border-b border-rule">
                    <summary
                      className={cx(
                        "flex min-h-14 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden",
                        isActive(group.href) ? "rounded-lg bg-clay-wash px-3 text-clay" : "text-ink",
                      )}
                    >
                      <span className="text-[1.15rem] font-semibold tracking-[-0.01em]">{group.label}</span>
                      <span className="transition-transform group-open:rotate-180">
                        <ChevronIcon />
                      </span>
                    </summary>
                    <ul className="pb-3">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={pathname === item.href ? "page" : undefined}
                            className={cx(
                              "flex min-h-11 items-center rounded-lg pl-3 text-[1rem]",
                              pathname === item.href ? "bg-clay-wash font-semibold text-clay" : "text-ink-soft",
                            )}
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

            <div className="mt-auto pt-8">
              <MobileAccount />
            </div>
          </div>
        </div>
      ) : null}
    </>
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

function ChevronIcon({ dir = "down" }: { dir?: "down" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden className="text-ink-mute">
      <path
        d={dir === "down" ? "m5 8 5 5 5-5" : "m8 5 5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

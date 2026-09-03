import Link from "next/link";
import { NAV } from "@/lib/nav";
import { SITE, MAPS_LINK } from "@/lib/site";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="bg-night text-paper-bright">
      {/* Running rail. Decorative, hidden from screen readers. */}
      <div aria-hidden className="overflow-hidden border-b border-white/10 py-4">
        <div className="rail flex w-max gap-8 whitespace-nowrap">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex gap-8">
              {[
                "Worship",
                "Grow",
                "Connect",
                "Serve",
                "Make disciples",
                "Worship",
                "Grow",
                "Connect",
                "Serve",
                "Make disciples",
              ].map((word, j) => (
                <span
                  key={`${i}-${j}`}
                  className="font-display text-2xl italic text-paper-bright/35"
                >
                  {word}
                  <span className="ml-8 text-clay">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[110rem] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div>
            <Wordmark tone="paper" />
            <address className="mt-6 not-italic text-[0.95rem] leading-relaxed text-paper-bright/70">
              {SITE.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noreferrer"
              className="label mt-5 inline-flex border border-paper-bright/30 px-4 py-2.5 text-paper-bright transition-colors hover:bg-paper-bright hover:text-night"
            >
              Get directions
            </a>
            <p className="mt-8 max-w-xs text-[0.85rem] leading-relaxed text-paper-bright/50">
              A satellite center of {SITE.parent}, making disciples who make
              disciples since 1984.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {NAV.map((group) => (
              <div key={group.label}>
                <p className="label text-clay">{group.label}</p>
                <ul className="mt-4 space-y-2">
                  {group.items.slice(0, 6).map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-[0.9rem] text-paper-bright/70 transition-colors hover:text-paper-bright"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="label text-clay">Care</p>
              <ul className="mt-4 space-y-2">
                {[
                  { label: "Request prayer", href: "/care/prayer" },
                  { label: "Talk to someone", href: "/care/talk" },
                  { label: "Know Jesus", href: "/know-jesus" },
                  { label: "Giving", href: "/giving" },
                  { label: "Contact", href: "/contact" },
                ].map((i) => (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      className="text-[0.9rem] text-paper-bright/70 transition-colors hover:text-paper-bright"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label text-clay">About</p>
              <ul className="mt-4 space-y-2">
                {[
                  { label: "Who we are", href: "/about" },
                  { label: "Sunday archive", href: "/watch/archive" },
                  { label: "Search", href: "/search" },
                  { label: "Admin", href: "/admin" },
                ].map((i) => (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      className="text-[0.9rem] text-paper-bright/70 transition-colors hover:text-paper-bright"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[0.8rem] text-paper-bright/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.parent}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-paper-bright">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-paper-bright">
              Terms
            </Link>
            <Link href="/accessibility" className="transition-colors hover:text-paper-bright">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

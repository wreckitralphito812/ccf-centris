import Link from "next/link";
import { SITE, MAPS_LINK, YOUTUBE, SOCIALS, SERVICE_TIMES_TEXT, organizationJsonLd } from "@/lib/site";
import { Wordmark } from "./wordmark";
import { FacebookGlyph, InstagramGlyph, YouTubeGlyph } from "./icons";

/**
 * Footer.
 *
 * Not a dump of the whole nav — the header already carries that. This is a
 * hand-picked set of short columns a visitor might want at the end of a
 * page, plus the brand block (address, contact, socials) and one last Sunday
 * nudge. Every href resolves to a real page.
 *
 * Communities, Serve & volunteer, Missions, Giving, and the whole Grow
 * column (discipleship journey, GLC, resources, Intercede, Know Jesus) are
 * pulled per CCF's request — those pages are gone until CCF is ready to add
 * them back, not just unlinked.
 *
 * The columns are real headings (h2), so a screen reader can jump between
 * them; the Organization JSON-LD lives here too.
 */

type FooterColumn = {
  heading: string;
  /** Anchor id for aria-labelledby on the column's list. */
  id: string;
  links: { label: string; href: string }[];
};

const COLUMNS: FooterColumn[] = [
  {
    heading: "Plan a visit",
    id: "footer-visit",
    links: [
      { label: "Getting here", href: "/visit#getting-here" },
    ],
  },
  {
    heading: "Watch",
    id: "footer-watch",
    links: [
      { label: "Last Sunday", href: "/watch" },
      { label: "Sunday archive", href: "/watch/archive" },
      { label: "4Ws guides", href: "/watch/4ws" },
    ],
  },
  {
    heading: "Connect",
    id: "footer-connect",
    links: [
      { label: "Join a Dgroup", href: "/grow/join-a-dgroup" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    heading: "Care",
    id: "footer-care",
    links: [
      { label: "Prayer Wall", href: "/prayer-wall" },
      { label: "Who we are", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

/** One utility-link style, shared by the brand block and the legal row. */
const utilLink =
  "tap-dense text-paper-bright/70 underline-offset-4 transition-colors hover:text-paper-bright hover:underline";

export function SiteFooter() {
  const hasContact = SITE.email || SITE.phone;

  return (
    <footer className="bg-night text-paper-bright">
      <script
        type="application/ld+json"
        // Structured data — safe, self-authored JSON with no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      {/* Last Sunday nudge, before the sitemap. */}
      {/* The one full-strength CCF teal moment on every page (2026-09-29):
          brand teal (#00a6b6) as a large surface, with a darker teal wash so
          the white type clears contrast. */}
      <div className="bg-[linear-gradient(100deg,#006d78_0%,#00879a_55%,#009fb0_100%)]">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xl font-semibold leading-snug tracking-[-0.01em] sm:text-2xl">
            Sunday services at {SERVICE_TIMES_TEXT}. See you there.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Solid cream, not teal: under the footer's .bg-night the
                inherited --clay is the lifted teal, and white on it failed
                contrast. Matches the "on-dark" button tone in ui.tsx. */}
            <Link
              href="/visit#getting-here"
              className="btn-press label rounded-lg tap border border-paper-bright bg-paper-bright px-4 py-2.5 text-night transition-colors hover:border-bone hover:bg-bone"
            >
              Getting here
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[110rem] px-5 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14">
        <h2 className="sr-only">Site footer</h2>

        <div className="grid gap-10 sm:gap-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
          {/* Brand block */}
          <div>
            <Wordmark variant="full" />
            <address className="mt-6 space-y-4 not-italic text-[0.95rem] leading-relaxed text-paper-bright/85">
              <span className="block">
                {SITE.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
              {hasContact ? (
                <span className="block space-y-1">
                  {SITE.email ? (
                    <a href={`mailto:${SITE.email}`} className={`block ${utilLink}`}>
                      {SITE.email}
                    </a>
                  ) : null}
                  {SITE.phone ? (
                    <a href={`tel:${SITE.phone}`} className={`block ${utilLink}`}>
                      {SITE.phoneDisplay ?? SITE.phone}
                    </a>
                  ) : null}
                </span>
              ) : null}
            </address>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={MAPS_LINK}
                target="_blank"
                rel="noreferrer"
                className="label tap rounded-lg border border-paper-bright/45 px-4 py-2.5 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
              >
                Get directions
              </a>
              {SOCIALS.instagram ? (
                <a
                  href={SOCIALS.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="CCF Centris on Instagram"
                  className="label tap min-w-11 justify-center gap-2 rounded-lg border border-paper-bright/45 px-3 py-2.5 sm:px-4 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
                >
                  <InstagramGlyph className="h-4 w-4" />
                  <span className="hidden sm:inline">Instagram</span>
                </a>
              ) : null}
              {SOCIALS.facebook ? (
                <a
                  href={SOCIALS.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="CCF Centris on Facebook"
                  className="label tap min-w-11 justify-center gap-2 rounded-lg border border-paper-bright/45 px-3 py-2.5 sm:px-4 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
                >
                  <FacebookGlyph className="h-4 w-4" />
                  <span className="hidden sm:inline">Facebook</span>
                </a>
              ) : null}
              <a
                href={YOUTUBE.channelUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="CCF on YouTube"
                className="label tap min-w-11 justify-center gap-2 rounded-lg border border-paper-bright/45 px-3 py-2.5 sm:px-4 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
              >
                <YouTubeGlyph className="h-4 w-4" />
                <span className="hidden sm:inline">YouTube</span>
              </a>
            </div>

            <p className="mt-6 max-w-xs text-[0.9rem] leading-relaxed text-paper-bright/65 sm:mt-8">
              A satellite center of {SITE.parent}, making disciples who make
              disciples since 1984.
            </p>
          </div>

          {/* Sitemap columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-8 md:gap-y-10"
          >
            {COLUMNS.map((col) => (
              <div key={col.id}>
                <h2
                  id={col.id}
                  className="text-[0.95rem] font-semibold text-clay-lift"
                >
                  {col.heading}
                </h2>
                <ul aria-labelledby={col.id} className="mt-2 lg:mt-4 lg:space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="tap text-[0.95rem] text-paper-bright/85 underline-offset-4 transition-colors hover:text-paper-bright hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 sm:mt-14 text-[0.85rem] text-paper-bright/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.parent}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/search" className={utilLink}>
              Search
            </Link>
            <Link href="/privacy" className={utilLink}>
              Privacy
            </Link>
            <Link href="/terms" className={utilLink}>
              Terms
            </Link>
            <Link href="/accessibility" className={utilLink}>
              Accessibility
            </Link>
            <a href="#main" className={`gap-1 ${utilLink}`}>
              <span aria-hidden>↑</span> Top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

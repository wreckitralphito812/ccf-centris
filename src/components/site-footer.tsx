import Link from "next/link";
import { SITE, MAPS_LINK, YOUTUBE, SOCIALS, SERVICE_TIMES, organizationJsonLd } from "@/lib/site";
import { Wordmark } from "./wordmark";

/**
 * Footer.
 *
 * Not a dump of the whole nav — the header already carries that. This is a
 * hand-picked set of five short columns a visitor might want at the end of a
 * page, plus the brand block (address, contact, socials) and one last Sunday
 * nudge. Every href resolves to a real page.
 *
 * The five columns are real headings (h2), so a screen reader can jump
 * between them; the Organization JSON-LD lives here too.
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
      { label: "New here", href: "/visit/new-here" },
      { label: "Getting here", href: "/visit/directions" },
    ],
  },
  {
    heading: "Watch",
    id: "footer-watch",
    links: [
      { label: "Last Sunday", href: "/watch" },
      { label: "Latest message", href: "/watch/latest" },
      { label: "Messages & series", href: "/watch/messages" },
      { label: "Sunday archive", href: "/watch/archive" },
      { label: "4Ws guides", href: "/watch/4ws" },
    ],
  },
  {
    heading: "Connect",
    id: "footer-connect",
    links: [
      { label: "Find a Dgroup", href: "/grow/find-a-dgroup" },
      { label: "Communities", href: "/communities" },
      { label: "Serve & volunteer", href: "/serve" },
      { label: "Missions", href: "/serve/missions" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    heading: "Grow",
    id: "footer-grow",
    links: [
      { label: "Discipleship journey", href: "/grow/journey" },
      { label: "GLC classes", href: "/grow/glc" },
      { label: "Resources", href: "/grow/resources" },
      { label: "Intercede", href: "/intercede" },
      { label: "Know Jesus", href: "/know-jesus" },
    ],
  },
  {
    heading: "Care & giving",
    id: "footer-care",
    links: [
      { label: "Prayer Wall", href: "/prayer-wall" },
      { label: "Giving", href: "/giving" },
      { label: "Who we are", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

/** One utility-link style, shared by the brand block and the legal row. */
const utilLink =
  "text-paper-bright/70 underline-offset-4 transition-colors hover:text-paper-bright hover:underline";

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
      <div className="border-b border-white/15">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-display text-xl leading-snug sm:text-2xl">
            We&rsquo;d love to see you this Sunday at {SERVICE_TIMES[0].time}.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Solid cream, not teal: under the footer's .bg-night the
                inherited --clay is the lifted teal, and white on it failed
                contrast. Matches the "on-dark" button tone in ui.tsx. */}
            <Link
              href="/visit/directions"
              className="btn-press label inline-flex items-center border border-paper-bright bg-paper-bright px-4 py-2.5 text-night transition-colors hover:border-bone hover:bg-bone"
            >
              Getting here
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[110rem] px-5 pb-24 pt-14 sm:px-8 sm:pb-14">
        <h2 className="sr-only">Site footer</h2>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
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
                className="label inline-flex border border-paper-bright/45 px-4 py-2.5 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
              >
                Get directions
              </a>
              {SOCIALS.instagram ? (
                <a
                  href={SOCIALS.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="CCF Centris on Instagram"
                  className="label inline-flex items-center gap-2 border border-paper-bright/45 px-4 py-2.5 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
                >
                  <InstagramGlyph />
                  Instagram
                </a>
              ) : null}
              {SOCIALS.facebook ? (
                <a
                  href={SOCIALS.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="CCF Centris on Facebook"
                  className="label inline-flex items-center gap-2 border border-paper-bright/45 px-4 py-2.5 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
                >
                  Facebook
                </a>
              ) : null}
              <a
                href={YOUTUBE.channelUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="CCF on YouTube"
                className="label inline-flex items-center gap-2 border border-paper-bright/45 px-4 py-2.5 text-paper-bright transition-colors hover:border-paper-bright hover:bg-paper-bright hover:text-night"
              >
                <YouTubeGlyph />
                YouTube
              </a>
            </div>

            <p className="mt-8 max-w-xs text-[0.85rem] leading-relaxed text-paper-bright/65">
              A satellite center of {SITE.parent}, making disciples who make
              disciples since 1984.
            </p>
          </div>

          {/* Sitemap columns */}
          <nav
            aria-label="Footer"
            className="grid gap-x-8 gap-y-10 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
          >
            {COLUMNS.map((col) => (
              <div key={col.id}>
                <h2
                  id={col.id}
                  className="label text-[0.8rem] tracking-[0.16em] text-clay-lift"
                >
                  {col.heading}
                </h2>
                <ul aria-labelledby={col.id} className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.92rem] text-paper-bright/85 underline-offset-4 transition-colors hover:text-paper-bright hover:underline"
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

        <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-[0.8rem] text-paper-bright/65 sm:flex-row sm:items-center sm:justify-between">
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
            <a href="#main" className={`inline-flex items-center gap-1 ${utilLink}`}>
              <span aria-hidden>↑</span> Top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Small YouTube glyph for the channel link. Inherits currentColor. */
function YouTubeGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1C24 15.6 24 12 24 12s0-3.6-.5-5.5ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}

/** Small Instagram glyph. Inherits currentColor. */
function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

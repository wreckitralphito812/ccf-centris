import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChromeOffset } from "@/components/chrome-offset";
import { SiteAnalytics } from "@/components/site-analytics";
import { SITE } from "@/lib/site";

/**
 * Manrope is the site's face for headlines and body alike (2026-10-01, design
 * A): the closest free match to Calendly's Gilroy, sharper than the
 * Montserrat it replaces. Ralph allowed leaving the Brand Book's Futura /
 * Proxima Nova pairing; CCF teal carries the brand instead.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "CCF Centris",
    template: "%s | CCF Centris",
  },
  description:
    "CCF Centris is a satellite of Christ's Commission Fellowship at 2/F Centris Station, Eton Centris, EDSA corner Quezon Avenue. Sunday services are at 10:00 AM and 3:00 PM.",
  openGraph: {
    type: "website",
    siteName: "CCF Centris",
    locale: "en_PH",
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "CCF Centris",
    description:
      "A satellite of Christ's Commission Fellowship at Eton Centris, Quezon City. Sundays at 10:00 AM and 3:00 PM.",
  },
  robots: { index: true, follow: true },
  /* Every page names its ccfcentris.org.ph address as the real one
     (2026-10-10). Search results still listed ccf-centris.vercel.app a week
     after the move; that address 308s here, and the canonical tag tells
     Google and Bing which one to keep. "./" resolves to each page's own path,
     without its query string. */
  alternates: { canonical: "./" },
};

/**
 * Before first paint, mark whether this browser was signed in last time, so
 * the header holds the right space for its account control instead of
 * shifting when `/auth/me` answers (2026-10-10). Key: ACCOUNT_HINT_KEY in
 * account-menu.tsx. `suppressHydrationWarning` on <html> covers the attribute.
 */
const ACCOUNT_HINT = `try{if(localStorage.getItem("ccf-account")==="in")document.documentElement.dataset.account="in"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCOUNT_HINT }} />
      </head>
      <body className="min-h-svh flex flex-col bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper-bright focus:text-sm"
        >
          Skip to content
        </a>
        <SiteHeader />
        <ChromeOffset />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
        <SiteAnalytics />
      </body>
    </html>
  );
}

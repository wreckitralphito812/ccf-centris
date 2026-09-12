import type { Metadata } from "next";
import { Jost, Montserrat } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChromeOffset } from "@/components/chrome-offset";
import { SITE } from "@/lib/site";

/**
 * The CCF Brand Book names two faces and no others: Futura Std Medium as the
 * primary (logo, headlines) and Proxima Nova as the secondary (web headlines,
 * headers, body). Both are Adobe-licensed.
 *
 * Jost is the free metric-compatible stand-in for Futura and ships here. Proxima
 * Nova comes from Adobe Fonts when a kit is configured (see ADOBE_FONTS_KIT_ID
 * below) and falls back to Montserrat, which is already in ccf.org.ph's own font
 * stack, until then.
 */
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

/**
 * Adobe Fonts kit id. Set `NEXT_PUBLIC_ADOBE_FONTS_KIT_ID` and Proxima Nova
 * activates for body copy with no other change — `--font-sans` already lists it
 * ahead of the Montserrat fallback. The kit must have the deployed domain
 * registered to it or Adobe refuses to serve the CSS.
 */
const ADOBE_FONTS_KIT_ID = process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "CCF Centris",
    template: "%s — CCF Centris",
  },
  description:
    "CCF Centris is a satellite center of Christ's Commission Fellowship at Eton Centris, EDSA corner Quezon Avenue. Join us for worship, find a Dgroup, and use the center.",
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
      "A satellite center of Christ's Commission Fellowship at Eton Centris. Worship with us, find a Dgroup, use the center.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${montserrat.variable} h-full antialiased`}
    >
      {ADOBE_FONTS_KIT_ID ? (
        <head>
          <link
            rel="stylesheet"
            href={`https://use.typekit.net/${ADOBE_FONTS_KIT_ID}.css`}
          />
        </head>
      ) : null}
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
      </body>
    </html>
  );
}

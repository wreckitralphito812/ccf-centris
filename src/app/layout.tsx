import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChromeOffset } from "@/components/chrome-offset";
import { SITE } from "@/lib/site";

/**
 * Montserrat is the site's only face, for headlines and body alike. The CCF
 * Brand Book names Futura (primary) and Proxima Nova (secondary), both
 * Adobe-licensed; Montserrat is already in ccf.org.ph's own font stack and is
 * the face the Centris team chose to launch with (2026-09-24).
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "CCF Centris",
    template: "%s | CCF Centris",
  },
  description:
    "CCF Centris is a satellite of Christ's Commission Fellowship at 2/F Centris Station, Eton Centris, EDSA corner Quezon Avenue. Sunday service is at 10:00 AM.",
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
      "A satellite of Christ's Commission Fellowship at Eton Centris, Quezon City. Sundays at 10:00 AM.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} h-full antialiased`}
    >
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

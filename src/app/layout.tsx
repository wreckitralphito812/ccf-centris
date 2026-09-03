import type { Metadata } from "next";
import { Fraunces, Montserrat, Caveat } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChromeOffset } from "@/components/chrome-offset";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { SITE } from "@/lib/site";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

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
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${montserrat.variable} ${caveat.variable} h-full antialiased`}
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
        <MobileActionBar />
      </body>
    </html>
  );
}

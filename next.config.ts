import type { NextConfig } from "next";

/**
 * Pages that still run on the original template's demo data (invented
 * sermons and speakers in src/data/teaching.ts, sample Dgroups in
 * src/data/community.ts) or on forms that don't send anything. They're sent to
 * the real page that covers the same need until real content exists. The code
 * behind them is kept; delete a line here to bring a page back.
 *
 * Temporary (307) on purpose, so browsers and search engines don't cache the
 * move for good.
 */
const PARKED: { source: string; destination: string }[] = [
  { source: "/watch/messages/:path*", destination: "/watch/archive" },
  { source: "/watch/series/:path*", destination: "/watch/archive" },
  { source: "/watch/speakers/:path*", destination: "/watch/archive" },
  { source: "/watch/latest", destination: "/watch" },
  { source: "/watch/live", destination: "/watch" },
  { source: "/grow", destination: "/grow/join-a-dgroup" },
  { source: "/grow/find-a-dgroup/:path*", destination: "/grow/join-a-dgroup" },
  { source: "/care/prayer", destination: "/prayer-wall" },
  { source: "/care/talk", destination: "/contact" },
  // Court booking isn't offered yet, and these pages were built around it.
  { source: "/centris/sports", destination: "/centris" },
  { source: "/centris/availability", destination: "/centris" },
  // "Your first Sunday" was removed at Ralph's request (2026-09-30); the Visit
  // page covers where and how. Old links land there.
  { source: "/visit/new-here", destination: "/visit" },
];

/**
 * Firebase's sign-in pages, served from our own domain (2026-10-02). Google's
 * account chooser names the auth domain ("to continue to …"), and Ralph wanted
 * it to say ccfcentris.org.ph instead of ccf-centris-4ad56.firebaseapp.com.
 * With these rewrites NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN can be our domain; the
 * OAuth client must also list https://<domain>/__/auth/handler as a redirect URI.
 * See https://firebase.google.com/docs/auth/web/redirect-best-practices.
 */
const FIREBASE_HOST = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
  : null;

/** One address for everyone, so sign-in and cookies live on a single domain. */
const CANONICAL_HOST = "ccfcentris.org.ph";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: `www.${CANONICAL_HOST}` }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
      ...PARKED.map((r) => ({ ...r, permanent: false })),
    ];
  },
  async rewrites() {
    if (!FIREBASE_HOST) return [];
    return [
      { source: "/__/auth/:path*", destination: `${FIREBASE_HOST}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `${FIREBASE_HOST}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;

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
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
    ],
  },
  async redirects() {
    return PARKED.map((r) => ({ ...r, permanent: false }));
  },
};

export default nextConfig;

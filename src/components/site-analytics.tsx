"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Visitor stats (2026-10-03): Vercel Web Analytics counts page views without
 * cookies or personal data, and only on the live site. Staff pages under
 * /admin are left out so the numbers show members and visitors, not the
 * facilities team checking the Today board.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => (new URL(event.url).pathname.startsWith("/admin") ? null : event)} />;
}

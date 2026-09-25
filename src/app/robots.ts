import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/my", "/sign-in", "/auth", "/api"],
    },
    sitemap: `${SITE.url.replace(/\/$/, "")}/sitemap.xml`,
  };
}

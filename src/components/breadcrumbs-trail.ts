import { SITE } from "@/lib/site";

/* ---------------------------------------------------------------------------
   Pure breadcrumb-trail logic — no React, no Next. Kept apart from the
   <Breadcrumbs> component so `tsx --test` (which can't load JSX) can cover it.
   --------------------------------------------------------------------------- */

export type Crumb = { label: string; href?: string };

const HOME: Crumb = { label: "Home", href: "/" };

/** The full trail with Home prepended. Callers never pass Home themselves. */
export function withHome(items: Crumb[]): Crumb[] {
  return [HOME, ...items];
}

/**
 * schema.org BreadcrumbList for a full trail (Home already included). The
 * last position is the current page and carries no `item` URL — Google
 * treats the final entry as the page itself.
 */
export function breadcrumbJsonLd(trail: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href && i < trail.length - 1
        ? { item: new URL(c.href, SITE.url).toString() }
        : {}),
    })),
  };
}

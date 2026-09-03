export const SITE = {
  name: "CCF Centris",
  parent: "Christ's Commission Fellowship",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ccfcentris.example.org",
  addressLines: [
    "2/F Centris Station",
    "Eton Centris",
    "EDSA corner Quezon Avenue",
    "Quezon City",
  ],
  /** Eton Centris, Quezon City. */
  geo: { lat: 14.6432, lng: 121.0388 },
  timezone: "Asia/Manila",
  mapQuery: "Eton Centris, EDSA corner Quezon Avenue, Quezon City",
  /**
   * Public contact points, shown in the footer and used in structured data.
   * Left null until CCF Centris publishes them — the UI hides any that are
   * unset rather than showing a placeholder. `phone` is E.164 for the tel:
   * link; `phoneDisplay` is how it reads on screen.
   */
  email: null as string | null,
  phone: null as string | null,
  phoneDisplay: null as string | null,
} as const;

/**
 * CCF's official YouTube channel (@CCFmainTV), where Sunday services stream.
 * Centris shares the CCF-wide stream until it has its own channel; the admin
 * can point a service at any provider and key, so this is a default, not a
 * hard-coded assumption.
 */
export const YOUTUBE = {
  handle: "@CCFmainTV",
  channelId: "UCF1Wrrlls2ioQyn5WG-_nIQ",
  channelUrl: "https://www.youtube.com/@CCFmainTV",
  /**
   * "Welcome to CCF" intro video, shown on the homepage above the Sunday
   * stream. Set to CCF's official welcome-video ID (the 11-char id from its
   * youtube.com/watch?v=… URL) to switch the placeholder for the real thing.
   */
  welcomeVideoId: null as string | null,
} as const;

/**
 * CCF Centris' own social accounts. The YouTube channel is CCF-wide (see
 * YOUTUBE above); these are the center's own.
 */
export const SOCIALS = {
  instagram: "https://www.instagram.com/ccfcentris/",
} as const;

/** Live embed for a channel. Falls back to the channel's current stream. */
export function youtubeLiveEmbed(channelId: string = YOUTUBE.channelId) {
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}&rel=0`;
}

/** Embed for a specific archived video. */
export function youtubeEmbed(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

export const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(
  SITE.mapQuery,
)}&output=embed`;

export const MAPS_LINK = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  SITE.mapQuery,
)}`;

/**
 * Organization structured data for the site root. Rendered once in the footer
 * as a <script type="application/ld+json">. Only includes contact points that
 * are actually set, and lists the center's social profiles under `sameAs` so
 * search engines can tie them together.
 */
export function organizationJsonLd() {
  const [street, ...rest] = SITE.addressLines;
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    name: SITE.name,
    parentOrganization: { "@type": "Church", name: SITE.parent },
    url: SITE.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: [street, rest[0]].filter(Boolean).join(", "),
      addressLocality: "Quezon City",
      addressRegion: "Metro Manila",
      addressCountry: "PH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.lat,
      longitude: SITE.geo.lng,
    },
    ...(SITE.email ? { email: SITE.email } : {}),
    ...(SITE.phone ? { telephone: SITE.phone } : {}),
    sameAs: [SOCIALS.instagram, YOUTUBE.channelUrl],
  };
}

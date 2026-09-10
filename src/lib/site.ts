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
 *
 * Both accounts are still being set up. A null URL means "not live yet": the
 * Connect page shows that button as coming soon, and the footer and structured
 * data leave it out. Fill in a URL and it goes live everywhere at once.
 */
export const SOCIALS: Record<"instagram" | "facebook", string | null> = {
  instagram: null,
  facebook: null,
};

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
    sameAs: [SOCIALS.instagram, SOCIALS.facebook, YOUTUBE.channelUrl].filter(
      (url): url is string => Boolean(url),
    ),
  };
}

/**
 * CCF Centris service times — the single source for every page that states
 * them, and for the seed schedule. One service for now; add an entry when a
 * second opens. `dow` is 0 for Sunday, in Manila time.
 */
export const SERVICE_TIMES = [
  { dow: 0, day: "Sunday", hour: 10, minute: 0, time: "10:00 AM" },
] as const;

/**
 * External sign-up flows run by CCF, linked from the Connect page. They are
 * CCF-wide forms, so the site links out rather than re-hosting them. The
 * volunteer URL is stored without the `fbclid` tracking parameter it was
 * shared with.
 */
export const CONNECT_LINKS = {
  dgroupSignup: "https://form.jotform.com/223131440974451",
  volunteerSignup: "https://volunteer-management.ccf.org.ph/recruitment/form",
} as const;

/**
 * CCF Net, CCF's online church. The Watch page embeds its Sunday replay and
 * invites people without a nearby satellite to join it.
 */
export const CCF_NET = {
  name: "CCF Net",
  url: "https://ccfnet.online.church/",
} as const;

/**
 * Where "Leave a message" on the Contact page goes. A staff inbox stands in
 * until CCF Centris has an official address; change it here when one exists.
 * `officeHours` stays null until confirmed, and the Contact page hides the
 * row rather than guess.
 */
export const CONTACT = {
  messageEmail: "adrian.camacho@ccf.org.ph",
  officeHours: null as string | null,
} as const;

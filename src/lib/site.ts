export const SITE = {
  name: "CCF Centris",
  parent: "Christ's Commission Fellowship",
  /* The live address until CCF's own domain is connected; then set
     NEXT_PUBLIC_SITE_URL on Vercel. Link previews (og:image) and the sitemap
     are built from this, so a placeholder here breaks shared links. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ccf-centris.vercel.app",
  addressLines: [
    "2/F Centris Station",
    "Eton Centris",
    "EDSA corner Quezon Avenue",
    "Quezon City",
  ],
  /**
   * The CCF Centris pin itself, read off the Google Maps place the center
   * shared (see MAPS_PLACE) — not the mall's. Every map surface derives from
   * these coordinates, so none of them can drift onto Eton Centris' own pin.
   */
  geo: { lat: 14.6433095, lng: 121.0389583 },
  timezone: "Asia/Manila",
  mapQuery: "CCF CENTRIS, Eton Centris, EDSA corner Quezon Avenue, Quezon City",
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
 * A null URL means "not live yet": the Connect page shows that button as
 * coming soon, and the footer and structured data leave it out. Facebook is
 * still being set up; fill in its URL and it goes live everywhere at once.
 */
export const SOCIALS: Record<"instagram" | "facebook", string | null> = {
  instagram: "https://www.instagram.com/ccfcentris/",
  facebook: "https://www.facebook.com/profile.php?id=61591537230410",
};

/** Live embed for a channel. Falls back to the channel's current stream. */
export function youtubeLiveEmbed(channelId: string = YOUTUBE.channelId) {
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}&rel=0`;
}

/** Embed for a specific archived video. */
export function youtubeEmbed(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

/**
 * The Google Maps place CCF Centris shared. Kept as the canonical pin: it is
 * the short link the team hands out, so "open the pin" anywhere on the site
 * lands on the same place card they see.
 */
export const MAPS_PLACE = "https://maps.app.goo.gl/Q9ARwxoW55aYQ69TA";

/** The pin as `lat,lng`. Coordinates, not a search string, so Google cannot
 *  resolve us to the mall entrance or a neighbouring tenant. */
const PIN = `${SITE.geo.lat},${SITE.geo.lng}`;

/**
 * Embedded map, dropped on the pin at street zoom. The `(label)` suffix is the
 * documented way to name a marker; Google's embed redirect strips it today and
 * the marker shows unlabelled, so it is kept for the day that changes and is
 * not something the page should be built to rely on.
 */
export const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(
  `${PIN}(${SITE.name})`,
)}&z=17&output=embed`;

/** "Get directions": opens Google Maps navigation straight to the pin. */
export const MAPS_LINK = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  PIN,
)}`;

/** The same trip in Waze, for drivers who navigate with it instead. */
export const WAZE_LINK = `https://www.waze.com/ul?ll=${encodeURIComponent(
  PIN,
)}&navigate=yes`;

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
 *
 * Every message arrives with `messageSubject`, so one Outlook rule can file
 * website mail into its own folder. That works on any mailbox, unlike a
 * "+tag" address, which Microsoft 365 bounces if the tenant has plus
 * addressing switched off.
 *
 * `officeHours` is a placeholder until the center confirms its hours; set it
 * to null and the Contact page hides the row.
 */
export const CONTACT = {
  messageEmail: "ccfcentris.admin@gmail.com",
  messageSubject: "[CCF Centris website] New message",
  officeHours: "10:00 AM – 9:00 PM" as string | null,
} as const;

/**
 * Where to park: the Eton Centris pin CCF Centris shared. Full parking
 * instructions come later; until then the directions page links this pin.
 */
export const PARKING = {
  name: "Eton Centris Elevated Parking 2",
  mapsUrl: "https://maps.app.goo.gl/sjFA6pVwzF5Bqk23A",
  /** The place's own coordinates, read from that link, for the map preview. */
  geo: { lat: 14.6418428, lng: 121.0410548 },
} as const;

/** Interactive map preview dropped on the parking pin. */
export const PARKING_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(
  `${PARKING.geo.lat},${PARKING.geo.lng}`,
)}&z=17&output=embed`;

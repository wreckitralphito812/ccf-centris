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

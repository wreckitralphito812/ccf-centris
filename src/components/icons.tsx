/**
 * Small line icons for section eyebrows on the landing page. Hand-drawn to
 * match the site's other inline SVGs (site-header, CommunityIcon) — 1.7px
 * stroke, round caps, `currentColor` so they take the eyebrow's tone. Not a
 * library; add a case here when a new section needs one.
 */

type IconName =
  | "message" // Sunday's message
  | "play" // Watch / the stream
  | "people" // Dgroups & communities
  | "building" // Around Centris
  | "hands" // Serve
  | "pin" // Where we are
  | "heart" // Prayer
  | "sparkle"; // intro / welcome

export function SectionIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const p = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  switch (name) {
    case "message":
      return (
        <svg {...p}>
          <path d="M4 5h16v11H9l-4 3v-3H4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );
    case "play":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="m10 8.5 6 3.5-6 3.5v-7Z" />
        </svg>
      );
    case "people":
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.4" />
          <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" />
          <path d="M15 14.6c2 .2 3.6 1.5 4 4" />
        </svg>
      );
    case "building":
      return (
        <svg {...p}>
          <path d="M4 21V6l8-3 8 3v15" />
          <path d="M4 21h16M9 21v-4h6v4" />
          <path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M16 13h.01" />
        </svg>
      );
    case "hands":
      return (
        <svg {...p}>
          <path d="M12 3v6" />
          <path d="M8 21c-2.5-1.5-4-4-4-7V8a1.5 1.5 0 0 1 3 0v3" />
          <path d="M16 21c2.5-1.5 4-4 4-7V8a1.5 1.5 0 0 0-3 0v3" />
          <path d="M9.5 11V6.5a1.25 1.25 0 0 1 2.5 0V11M12 6.5a1.25 1.25 0 0 1 2.5 0V11" />
        </svg>
      );
    case "pin":
      return (
        <svg {...p}>
          <path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case "heart":
      return (
        <svg {...p}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...p}>
          <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3Z" />
          <path d="M19 15l.7 1.8L21.5 17l-1.8.7L19 19.5l-.7-1.8L16.5 17l1.8-.2L19 15Z" />
        </svg>
      );
  }
}

export type { IconName };

/**
 * Solid play triangle for media buttons — the standard convention, filled
 * rather than the outlined `SectionIcon name="play"` used in eyebrows. Takes
 * `currentColor`; nudge it right by ~1px in a circular button so it reads as
 * centered.
 */
export function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.5-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

/**
 * Instagram's glyph — the rounded square, the lens, and the flash dot.
 * Drawn at the same 1.7px stroke as the section icons so it sits with the
 * rest of the site's line work, and takes `currentColor`.
 */
export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Facebook's "f" mark, filled, taking `currentColor`. */
export function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M13.5 21.9v-7.4h2.5l.4-2.9h-2.9V9.8c0-.8.2-1.4 1.4-1.4h1.6V5.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.1H8v2.9h2.4v7.4a10 10 0 1 1 3.1-.1Z" />
    </svg>
  );
}

/** YouTube's play-button mark, filled, taking `currentColor`. */
export function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1C24 15.6 24 12 24 12s0-3.6-.5-5.5ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}

import Image from "next/image";
import { cx } from "./ui";

/**
 * The official CCF Centris satellite marks, as supplied by CCF Centris. Two
 * lockups, used interchangeably by fit:
 *
 * - "horizontal": the ring and CENTRIS on one line. Header and tight spots.
 * - "full": the same with "Christ's Commission Fellowship" beneath. Footer,
 *   and anywhere with room.
 *
 * The CCF Brand Book sets a 50px minimum height for satellite marks on the
 * web and forbids redrawing, recolouring, or adding effects, so these render
 * the supplied files as they are and never below that height.
 */
const MARKS = {
  horizontal: { src: "/logos/ccf-centris-horizontal.png", width: 2872, height: 1196 },
  full: { src: "/logos/ccf-centris-full.png", width: 3927, height: 1538 },
} as const;

export function Wordmark({
  variant = "horizontal",
  className,
}: {
  variant?: keyof typeof MARKS;
  className?: string;
}) {
  const mark = MARKS[variant];
  return (
    <Image
      src={mark.src}
      width={mark.width}
      height={mark.height}
      alt="CCF Centris"
      priority={variant === "horizontal"}
      sizes={variant === "horizontal" ? "(min-width: 80rem) 140px, 120px" : "240px"}
      className={cx(
        // no-frame opts out of the site-wide image frame: the brand book allows
        // nothing drawn on or around the mark.
        "no-frame w-auto",
        // The brand book's 50px floor for satellite marks on the web is the
        // small end, not the only size: the header mark holds at 50px through
        // phone and tablet, then takes the room a wide header gives it. It
        // never goes below the floor.
        variant === "horizontal" ? "h-[50px] xl:h-[56px]" : "h-[80px] sm:h-[90px]",
        className,
      )}
    />
  );
}

/**
 * The CCF mark: a lowercase "ccf" wordmark inside a thin ring.
 *
 * Redrawn from CCF's official mark so it scales cleanly and inherits colour
 * from `currentColor` — the supplied asset is a raster lockup on a photo
 * background, which cannot sit beside type. Proportions follow the original:
 * the wordmark occupies the lower-middle of the ring, the two c's are open
 * counters of equal weight, and the f rises above their x-height with a
 * hooked terminal and a crossbar that ties it to the second c.
 *
 * Replace with CCF's own vector once brand assets are provided.
 */
export function CcfMark({
  className,
  title = "CCF",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={cx("shrink-0", className)}
      fill="none"
    >
      <circle cx="50" cy="50" r="43" stroke="currentColor" strokeWidth="5" />
      {/* First c — an open counter, mouth to the right. */}
      <path
        d="M43.8 45.4a12.4 12.4 0 1 0 0 17.2"
        stroke="currentColor"
        strokeWidth="7.6"
        strokeLinecap="round"
      />
      {/* Second c, same weight and aperture. */}
      <path
        d="M64.6 45.4a12.4 12.4 0 1 0 0 17.2"
        stroke="currentColor"
        strokeWidth="7.6"
        strokeLinecap="round"
      />
      {/* f — ascender with a hooked terminal, sitting on the baseline. */}
      <path
        d="M70.4 68V42.2c0-5.9 4.6-10.1 10.2-9.1"
        stroke="currentColor"
        strokeWidth="7.6"
        strokeLinecap="round"
      />
      {/* Crossbar, tying the f to the second c. */}
      <path
        d="M62.4 48.6h15.4"
        stroke="currentColor"
        strokeWidth="6.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

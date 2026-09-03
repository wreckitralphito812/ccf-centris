import { cx } from "./ui";

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

/** Mark plus the center name, used in the header and footer. */
export function Wordmark({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const fg = tone === "paper" ? "text-paper-bright" : "text-ink";
  return (
    <span className={cx("flex items-center gap-2.5", fg)}>
      <CcfMark className="h-8 w-8 text-clay" />
      <span className="flex flex-col leading-none">
        <span className="stencil text-[0.95rem] leading-none">CCF</span>
        <span className="font-display text-[1.15rem] italic leading-none tracking-tight">
          Centris
        </span>
      </span>
    </span>
  );
}

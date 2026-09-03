import { cx } from "./ui";

/**
 * The CCF mark: lowercase geometric "ccf" inside a thin ring.
 * Redrawn from the official logo at ccf.org.ph so it scales and inherits
 * colour. Replace with the supplied vector once CCF provides brand assets.
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
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5.5" />
      {/* Two open counters and an f, matching the mark's geometry. */}
      <path
        d="M40.5 40.2a13.5 13.5 0 1 0 0 19.6"
        stroke="currentColor"
        strokeWidth="8.4"
        strokeLinecap="butt"
      />
      <path
        d="M62.5 40.2a13.5 13.5 0 1 0 0 19.6"
        stroke="currentColor"
        strokeWidth="8.4"
        strokeLinecap="butt"
      />
      <path
        d="M67.5 65V42.5c0-6.2 5-11.2 11.2-11.2 2.3 0 4.3.6 5.8 1.6"
        stroke="currentColor"
        strokeWidth="8.4"
        strokeLinecap="butt"
      />
      <path d="M62 50.5h18" stroke="currentColor" strokeWidth="7.6" />
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

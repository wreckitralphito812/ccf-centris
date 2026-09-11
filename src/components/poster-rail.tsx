"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * A row of posters that scrolls sideways, in the style of life.church/media.
 * Phones swipe it; wider screens also get round previous/next buttons, which
 * hide at either end of the row.
 *
 * Plain CSS scroll-snap, no carousel library: the row is a real scrolling list,
 * so touch, trackpad, keyboard and screen readers all work on it natively.
 * Pass `<li>` children with their own widths and `snap-start`.
 */
export function PosterRail({
  label,
  children,
  className,
}: {
  /** Names the list for screen readers, e.g. "Coming up". */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft < 8);
      setAtEnd(el.scrollLeft + el.clientWidth > el.scrollWidth - 8);
    };
    // The observer also fires once on observe, which sets the first state.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  function page(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.9,
      behavior: reduce ? "auto" : "smooth",
    });
  }

  return (
    <div className={cx("relative", className)}>
      <ul
        ref={ref}
        aria-label={label}
        className="no-bar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 sm:gap-5"
      >
        {children}
      </ul>
      <RailButton side="previous" hidden={atStart} onClick={() => page(-1)} />
      <RailButton side="next" hidden={atEnd} onClick={() => page(1)} />
    </div>
  );
}

function RailButton({
  side,
  hidden,
  onClick,
}: {
  side: "previous" | "next";
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "previous" ? "Previous posters" : "Next posters"}
      tabIndex={hidden ? -1 : 0}
      // Not .btn-press: that global class sets position: relative, which
      // outranks Tailwind's `absolute` and dropped these arrows below the row.
      // z-10 lifts them over the page grain instead.
      className={cx(
        "absolute top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-paper-bright text-ink shadow-[0_8px_24px_-10px_rgba(0,0,0,0.45)] transition-opacity sm:grid",
        side === "previous" ? "-left-3" : "-right-3",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={side === "previous" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
      </svg>
    </button>
  );
}

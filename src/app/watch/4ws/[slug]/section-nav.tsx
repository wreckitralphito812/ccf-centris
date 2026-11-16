"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";

/**
 * Sticky section nav for a 4Ws guide. Highlights the section currently in
 * view. Plain anchor links, so it works with JS off — the active state is
 * the only thing that needs the client.
 *
 * On phones it is a row of chips that stays under the header while you read
 * (2026-11-15), so a Dgroup leader can jump between Welcome, Word and Works
 * without scrolling back to the top. The row scrolls sideways, and keeps the
 * current section's chip in view.
 */
export function SectionNav({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);

  // Slide the chip row so the current chip is visible. Sets scrollLeft on the
  // row itself; scrollIntoView would also move the page.
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({
      left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [active]);

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => e != null);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav
      ref={navRef}
      aria-label="Guide sections"
      className="sticky top-[calc(var(--chrome,4.875rem)-2px)] z-30 -mx-5 flex min-w-0 gap-1 self-start overflow-x-auto border-b border-hairline bg-paper/95 px-5 py-2 sm:-mx-8 sm:px-8 backdrop-blur [scrollbar-width:none] lg:top-24 lg:z-auto lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          aria-current={active === i.id ? "true" : undefined}
          className={cx(
            "label shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors lg:rounded-none lg:border-l-2 lg:px-4 lg:py-2",
            active === i.id
              ? "bg-clay/10 text-clay lg:border-clay"
              : "text-ink-mute hover:text-ink lg:border-hairline",
          )}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}

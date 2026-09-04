"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

/**
 * Sticky section nav for a 4Ws guide. Highlights the section currently in
 * view. Plain anchor links, so it works with JS off — the active state is
 * the only thing that needs the client.
 */
export function SectionNav({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

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
      aria-label="Guide sections"
      className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:gap-0.5 lg:overflow-visible"
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

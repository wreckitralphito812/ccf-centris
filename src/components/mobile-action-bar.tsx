"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Sticky bar on small screens. Sunday shows visit-and-watch actions,
 * weekdays show the things people actually come here for midweek.
 * Rendered only after mount so the server never guesses the viewer's day.
 */
export function MobileActionBar() {
  const pathname = usePathname();
  const [weekend, setWeekend] = useState<boolean | null>(null);

  useEffect(() => {
    const manilaDay = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        weekday: "short",
      })
        .format(new Date())
        .replace(/Sun/, "0")
        .replace(/Mon/, "1")
        .replace(/Tue/, "2")
        .replace(/Wed/, "3")
        .replace(/Thu/, "4")
        .replace(/Fri/, "5")
        .replace(/Sat/, "6"),
    );
    setWeekend(manilaDay === 0 || manilaDay === 6);
  }, []);

  // Never cover an admin console or a booking form's own controls.
  if (pathname.startsWith("/admin")) return null;
  if (weekend === null) return null;

  const items = weekend
    ? [
        { label: "Visit", href: "/visit/plan" },
        { label: "Live", href: "/watch/live" },
        { label: "Directions", href: "/visit/directions" },
        { label: "More", href: "/search" },
      ]
    : [
        { label: "Events", href: "/events" },
        { label: "Dgroups", href: "/grow/find-a-dgroup" },
        { label: "Reserve", href: "/centris/reserve" },
        { label: "More", href: "/search" },
      ];

  return (
    <nav
      aria-label="Quick actions"
      className="sticky bottom-0 z-40 grid grid-cols-4 border-t border-hairline bg-paper-bright/95 backdrop-blur-sm sm:hidden"
    >
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="label py-3.5 text-center text-ink transition-colors active:bg-ink/5"
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import type { AdminCount } from "@/lib/nav";
import { ADMIN_NAV } from "@/lib/nav";

/**
 * The admin menu (2026-10-14): the page you're on is marked, and anything
 * waiting for staff carries a count, so nobody has to remember where to look.
 */
export function AdminNav({ counts }: { counts: Partial<Record<AdminCount, number>> }) {
  const path = usePathname();
  const isOn = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Admin" className="shrink-0 lg:sticky lg:top-8 lg:w-60 lg:self-start print:hidden">
      <div className="no-bar flex gap-6 overflow-x-auto pb-2 lg:block lg:space-y-6 lg:overflow-visible lg:pb-0">
        {ADMIN_NAV.map((section) => (
          <div key={section.section} className="shrink-0">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-mute">{section.section}</p>
            <ul className="mt-2 flex gap-1.5 lg:block lg:space-y-0.5">
              {section.items.map((item) => {
                const n = item.count ? (counts[item.count] ?? 0) : 0;
                const on = isOn(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={on ? "page" : undefined}
                      className={cx(
                        "flex min-h-10 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 text-[0.95rem] transition-colors",
                        on ? "bg-clay font-semibold text-paper-bright" : "text-ink hover:bg-clay/10 hover:text-clay-deep",
                      )}
                    >
                      {item.label}
                      {n > 0 ? (
                        <span
                          aria-label={`${n} waiting`}
                          className={cx(
                            "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[0.78rem] font-bold",
                            on ? "bg-paper-bright text-clay" : "bg-clay text-paper-bright",
                          )}
                        >
                          {n}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

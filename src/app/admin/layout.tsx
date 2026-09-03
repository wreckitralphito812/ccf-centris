import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_NAV } from "@/lib/nav";
import { CcfMark } from "@/components/wordmark";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — CCF Centris Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 * A preview of the console CCF Centris staff would use. It is deliberately
 * quiet: no charts competing for attention, no vanity metrics, just the
 * queues someone actually works through on a Monday morning.
 *
 * Nothing here is authenticated yet. In the live system every route is gated
 * by the role policies in supabase/migrations/0002_rls.sql, so a facilities
 * administrator never sees a prayer request.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-paper-deep">
      <div className="border-b border-hairline bg-night text-paper-bright">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-4 px-5 py-3 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <CcfMark className="h-7 w-7 text-clay" />
            <span className="flex flex-col leading-none">
              <span className="stencil text-[0.85rem]">CCF Centris</span>
              <span className="label text-paper-bright/50">Admin</span>
            </span>
          </Link>

          <p className="label ml-auto hidden text-paper-bright/40 sm:block">
            Preview — not connected to live data
          </p>

          <Link
            href="/"
            className="label border border-paper-bright/25 px-3.5 py-2 text-paper-bright transition-colors hover:bg-white/10"
          >
            View site
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-[110rem] flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
        <nav
          aria-label="Admin"
          className="shrink-0 lg:w-56 lg:sticky lg:top-8 lg:self-start"
        >
          <div className="no-bar flex gap-6 overflow-x-auto pb-2 lg:block lg:space-y-7 lg:overflow-visible lg:pb-0">
            {ADMIN_NAV.map((section) => (
              <div key={section.section} className="shrink-0">
                <p className="label text-ink-mute">{section.section}</p>
                <ul className="mt-2 flex gap-2 lg:mt-3 lg:block lg:space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block whitespace-nowrap py-1.5 text-[0.9rem] text-ink-soft transition-colors hover:text-clay lg:whitespace-normal"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getAdminCounts } from "@/lib/queries";
import { AdminNav } from "./admin-nav";
import { CcfMark } from "@/components/wordmark";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { adminLogout } from "@/app/actions/admin";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — CCF Centris Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell: one shared staff access code, a menu of what works (with
 * counts on anything waiting, 2026-10-14), and the page.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Shared-code gate. When no code is configured the console stays open but
  // read-only (mutations refuse in the actions themselves).
  const gated = isAdminConfigured();
  const signedIn = gated ? await isAdmin() : true;
  const counts = signedIn ? await getAdminCounts() : {};

  return (
    <div className="min-h-screen bg-paper-deep print:bg-white">
      <div className="border-b border-hairline bg-night text-paper-bright print:hidden">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-4 px-5 py-3 sm:px-8">
          <Link href="/admin" className="flex min-h-10 items-center gap-2.5">
            <CcfMark className="h-7 w-7 text-clay" />
            <span className="flex flex-col leading-none">
              <span className="stencil text-[0.85rem]">CCF Centris</span>
              <span className="label text-paper-bright/50">Admin</span>
            </span>
          </Link>

          <p className="label ml-auto hidden text-paper-bright/40 sm:block">
            {gated
              ? signedIn
                ? "Signed in"
                : "Sign in to continue"
              : "Preview — read-only"}
          </p>

          <Link
            href="/"
            className="label border border-paper-bright/25 px-3.5 py-2 text-paper-bright transition-colors hover:bg-white/10"
          >
            View site
          </Link>

          {gated && signedIn ? (
            <form action={adminLogout}>
              <button
                type="submit"
                className="label border border-paper-bright/25 px-3.5 py-2 text-paper-bright transition-colors hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {gated && !signedIn ? (
        <div className="mx-auto max-w-sm px-5 py-16 sm:px-8">
          <h1 className="font-display text-3xl leading-tight">Admin sign in</h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
            Staff share one access code. Ask the Centris office if you need it.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[110rem] flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
          <AdminNav counts={counts} />

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      )}
    </div>
  );
}

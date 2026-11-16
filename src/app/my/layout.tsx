import { redirect } from "next/navigation";

import { hasAccounts } from "@/lib/auth/session";

/**
 * Everything under /my needs a signed-in account. When accounts aren't
 * configured there are no accounts, so the section simply isn't available.
 * Each page checks sign-in itself with requireMember(its own path), so
 * signing in brings you back to the page you asked for (2026-11-16). Every
 * query under /my also scopes itself to the member, so a page that forgot
 * would show nothing, not someone else's data.
 */
export default async function MyLayout({ children }: LayoutProps<"/my">) {
  if (!hasAccounts()) redirect("/");

  return <>{children}</>;
}

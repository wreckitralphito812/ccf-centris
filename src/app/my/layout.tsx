import { redirect } from "next/navigation";

import { currentUser, hasAccounts } from "@/lib/auth/session";

/**
 * Everything under /my needs a signed-in account. When accounts aren't
 * configured there are no accounts, so the section simply isn't available.
 */
export default async function MyLayout({ children }: LayoutProps<"/my">) {
  if (!hasAccounts()) redirect("/");
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/my/reservations");

  return <>{children}</>;
}

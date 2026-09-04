import { redirect } from "next/navigation";

import { currentUser } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";

/**
 * Everything under /my needs a signed-in account. When Supabase isn't
 * configured there are no accounts, so the section simply isn't available.
 */
export default async function MyLayout({ children }: LayoutProps<"/my">) {
  if (!hasSupabase()) redirect("/");
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/my/reservations");

  return <>{children}</>;
}

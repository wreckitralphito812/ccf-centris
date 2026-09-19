import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/ssr";

/**
 * Exchanges the `code` from a magic-link email, or from Google or Facebook,
 * for a session, then sends the member on to wherever they were headed
 * (`next`, same-origin only), by way of /my/setup if their name or screen
 * name is missing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/my/reservations";
  const next = nextParam.startsWith("/") ? nextParam : "/my/reservations";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First sign-in (or anything missing): ask for first name, surname and
      // a Prayer Wall screen name before going on. Only when the lookups
      // themselves worked, so a missing migration can't trap people here.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: profile, error: profileError }, { data: screenName, error: nameError }] =
        await Promise.all([
          supabase.from("profiles").select("first_name, last_name").eq("id", user?.id ?? "").maybeSingle(),
          supabase.rpc("my_screen_name"),
        ]);
      const incomplete =
        (!profileError && (!profile?.first_name || !profile?.last_name)) || (!nameError && !screenName);
      if (incomplete) {
        return NextResponse.redirect(`${origin}/my/setup?next=${encodeURIComponent(next)}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("auth callback: code exchange failed", error);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=link`);
}

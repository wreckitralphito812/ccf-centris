import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/ssr";

/**
 * Exchanges the `code` from a magic-link / OTP email for a session, then
 * sends the user on to wherever they were headed (`next`, same-origin only).
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
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("auth callback: code exchange failed", error);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=link`);
}

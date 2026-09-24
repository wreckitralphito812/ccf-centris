"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServer } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";
import { isDisposableEmail } from "@/lib/member";

export interface AuthResult {
  ok: boolean;
  sent?: boolean;
  formError?: string;
}

const EMAIL = /.+@.+\..+/;

/**
 * Email a one-time sign-in link. Same response whether or not the address has
 * an account — the link creates one on first use (the `on_auth_user_created`
 * trigger provisions the profile).
 */
export async function sendMagicLink(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  if (!hasSupabase()) {
    return { ok: false, formError: "Accounts aren't available in this environment yet." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextRaw = String(formData.get("next") ?? "/my/reservations");
  const next = nextRaw.startsWith("/") ? nextRaw : "/my/reservations";

  if (!EMAIL.test(email)) {
    return { ok: false, formError: "Enter a valid email address." };
  }
  if (isDisposableEmail(email)) {
    return {
      ok: false,
      formError: "Please use an email address you'll keep. We use it for your bookings and to reach you.",
    };
  }

  // Optional. Kept only if it holds phone-ish characters after a light clean;
  // no strict format is enforced. Reaches the profile via the
  // `on_auth_user_created` trigger, which reads `mobile` from user metadata —
  // so it lands on first signup only.
  const phone =
    String(formData.get("phone") ?? "")
      .replace(/[^\d+()\-\s]/g, "")
      .replace(/\s+/g, " ")
      .trim() || null;

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createSupabaseServer();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: phone ? { mobile: phone } : undefined,
    },
  });

  if (error) {
    console.error("sendMagicLink failed", error);
    return { ok: false, formError: "Could not send the link. Try again in a moment." };
  }

  return { ok: true, sent: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}

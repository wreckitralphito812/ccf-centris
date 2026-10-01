"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cleanName, nameProblem } from "@/lib/member";
import { safeNext } from "@/lib/prayer-wall";
import { normalizePhMobile, phMobileProblem } from "@/lib/phone";
import { currentUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface SetupResult {
  ok: boolean;
  fieldErrors?: Partial<Record<"first" | "last" | "mobile", string>>;
  formError?: string;
}

/**
 * The "finish setting up" step after a first sign-in: the member's first name,
 * surname and mobile number, which CCF Centris keeps on file. The Prayer Wall
 * screen name is no longer asked here (2026-10-01); the Wall asks for one the
 * first time someone posts.
 */
export async function completeProfile(
  _prev: SetupResult | null,
  formData: FormData,
): Promise<SetupResult> {
  const user = await currentUser();
  if (!user) return { ok: false, formError: "Your session ended. Sign in again." };

  const first = cleanName(formData.get("first_name"));
  const last = cleanName(formData.get("last_name"));
  const mobileRaw = String(formData.get("mobile") ?? "");
  const errors: SetupResult["fieldErrors"] = {};
  const fp = nameProblem(first, "first name");
  const lp = nameProblem(last, "surname");
  const mp = phMobileProblem(mobileRaw);
  if (fp) errors.first = fp;
  if (lp) errors.last = lp;
  if (mp) errors.mobile = mp;
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  const db = supabaseAdmin();
  const { error: nameError } = await db
    .from("profiles")
    .update({
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`,
      mobile: normalizePhMobile(mobileRaw),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (nameError) {
    console.error("completeProfile: saving the name failed", nameError);
    return { ok: false, formError: "We couldn't save your details. Try again in a moment." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next"), "/my/reservations"));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cleanName, nameProblem } from "@/lib/member";
import { normalizeScreenName, safeNext, screenNameProblem, SCREEN_NAME_RULE } from "@/lib/prayer-wall";
import { currentUser } from "@/lib/auth/session";
import { setMemberScreenName } from "@/lib/auth/profile";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface SetupResult {
  ok: boolean;
  fieldErrors?: Partial<Record<"first" | "last" | "screen", string>>;
  formError?: string;
}

/**
 * The "finish setting up" step after a first sign-in: the member's first name
 * and surname (which CCF Centris keeps on file), and the screen name the
 * Prayer Wall shows instead of their real name.
 */
export async function completeProfile(
  _prev: SetupResult | null,
  formData: FormData,
): Promise<SetupResult> {
  const user = await currentUser();
  if (!user) return { ok: false, formError: "Your session ended. Sign in again." };

  const first = cleanName(formData.get("first_name"));
  const last = cleanName(formData.get("last_name"));
  const screenRaw = String(formData.get("screen_name") ?? "");
  const errors: SetupResult["fieldErrors"] = {};
  const fp = nameProblem(first, "first name");
  const lp = nameProblem(last, "surname");
  const sp = screenNameProblem(screenRaw);
  if (fp) errors.first = fp;
  if (lp) errors.last = lp;
  if (sp) errors.screen = sp;
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  const db = supabaseAdmin();
  const { error: nameError } = await db
    .from("profiles")
    .update({ first_name: first, last_name: last, full_name: `${first} ${last}`, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (nameError) {
    console.error("completeProfile: saving the name failed", nameError);
    return { ok: false, formError: "We couldn't save your name. Try again in a moment." };
  }

  const error = await setMemberScreenName(user.id, normalizeScreenName(screenRaw));
  if (error === "taken") return { ok: false, fieldErrors: { screen: "That screen name is taken. Try another." } };
  if (error === "format") return { ok: false, fieldErrors: { screen: SCREEN_NAME_RULE } };
  if (error) return { ok: false, formError: "We couldn't save your screen name. Try again in a moment." };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next"), "/my/reservations"));
}

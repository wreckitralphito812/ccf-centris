import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * A member's own profile fields, read and written with the service role. The
 * caller must already have resolved the member from their session
 * (`currentUser()`); never pass an id that came from the request.
 */

export async function getMemberProfile(memberId: string) {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("email, full_name, first_name, last_name, mobile, screen_name")
    .eq("id", memberId)
    .maybeSingle();
  if (error) console.error("getMemberProfile failed", error);
  return data as {
    email: string | null;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    mobile: string | null;
    screen_name: string | null;
  } | null;
}

/**
 * Set a member's Prayer Wall screen name. The database enforces the format
 * and case-insensitive uniqueness; a rename also relabels their past posts
 * (trigger `prayer_wall_follow_rename`).
 */
export async function setMemberScreenName(
  memberId: string,
  screen: string,
): Promise<"taken" | "format" | "failed" | null> {
  const db = supabaseAdmin();
  const { data: current } = await db.from("profiles").select("screen_name").eq("id", memberId).maybeSingle();
  if (current?.screen_name === screen) return null;
  const { error } = await db
    .from("profiles")
    .update({ screen_name: screen, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (!error) return null;
  if (error.code === "23505") return "taken";
  if (error.code === "23514") return "format";
  console.error("setMemberScreenName failed", error);
  return "failed";
}

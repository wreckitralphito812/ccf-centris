"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  bodyProblem,
  cleanBody,
  normalizeScreenName,
  safeNext,
  SCREEN_NAME_RULE,
  screenNameProblem,
} from "@/lib/prayer-wall";
import { hasSupabase, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";

/**
 * Prayer Wall writes. Every call runs under the member's own session, so the
 * row-level security in 0005_screen_names_and_prayer_wall.sql decides what
 * lands: the author is always the caller, names and expiry are stamped by the
 * database, and only moderators can hide anything.
 */

export interface WallResult {
  ok: boolean;
  error?: string;
}

const GENERIC = "Something went wrong on our end — try again in a moment.";

async function memberSession() {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

function wallError(error: { code?: string; message?: string }, where: string): string {
  if (error.code === "P0001") {
    return /screen name/i.test(error.message ?? "")
      ? "Choose a screen name before posting."
      : "That prayer request is no longer open.";
  }
  console.error(`${where} failed`, error);
  return GENERIC;
}

/** Parse "post:<uuid>" or "reply:<uuid>". */
function parseTarget(raw: FormDataEntryValue | null) {
  const [kind, id] = String(raw ?? "").split(":");
  return (kind === "post" || kind === "reply") && id ? { kind, id } : null;
}

export async function setScreenName(
  _prev: WallResult | null,
  formData: FormData,
): Promise<WallResult> {
  const s = await memberSession();
  if (!s) return { ok: false, error: "Sign in to choose a screen name." };

  const raw = String(formData.get("screen_name") ?? "");
  const problem = screenNameProblem(raw);
  if (problem) return { ok: false, error: problem };

  const { error } = await s.supabase.rpc("set_screen_name", {
    new_name: normalizeScreenName(raw),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That screen name is taken. Try another." };
    if (error.code === "23514") return { ok: false, error: SCREEN_NAME_RULE };
    console.error("setScreenName failed", error);
    return { ok: false, error: GENERIC };
  }

  revalidatePath("/prayer-wall");
  redirect(safeNext(formData.get("next")));
}

export async function postPrayerRequest(
  _prev: WallResult | null,
  formData: FormData,
): Promise<WallResult> {
  const s = await memberSession();
  if (!s) return { ok: false, error: "Sign in to post a prayer request." };

  const body = cleanBody(formData.get("body"));
  const problem = bodyProblem(body);
  if (problem) return { ok: false, error: problem };

  const { error } = await s.supabase
    .from("prayer_wall_posts")
    .insert({ satellite_id: SATELLITE_ID, author_id: s.user.id, body });
  if (error) return { ok: false, error: wallError(error, "postPrayerRequest") };

  revalidatePath("/prayer-wall");
  return { ok: true };
}

export async function replyToPrayer(
  _prev: WallResult | null,
  formData: FormData,
): Promise<WallResult> {
  const s = await memberSession();
  if (!s) return { ok: false, error: "Sign in to pray for this request." };

  const postId = String(formData.get("post_id") ?? "");
  const kind = formData.get("kind") === "message" ? "message" : "prayer";
  const body = cleanBody(formData.get("body"));
  const problem = bodyProblem(body);
  if (!postId) return { ok: false, error: GENERIC };
  if (problem) return { ok: false, error: problem };

  const { error } = await s.supabase
    .from("prayer_wall_replies")
    .insert({ post_id: postId, author_id: s.user.id, kind, body });
  if (error) return { ok: false, error: wallError(error, "replyToPrayer") };

  revalidatePath("/prayer-wall");
  return { ok: true };
}

export async function reportPrayerItem(
  _prev: WallResult | null,
  formData: FormData,
): Promise<WallResult> {
  const s = await memberSession();
  const target = parseTarget(formData.get("target"));
  if (!s || !target) return { ok: false, error: GENERIC };

  const { error } = await s.supabase.from("prayer_wall_reports").insert({
    reporter_id: s.user.id,
    post_id: target.kind === "post" ? target.id : null,
    reply_id: target.kind === "reply" ? target.id : null,
  });
  // Reporting the same thing twice is still "reported".
  if (error && error.code !== "23505") {
    console.error("reportPrayerItem failed", error);
    return { ok: false, error: GENERIC };
  }

  revalidatePath("/prayer-wall");
  return { ok: true };
}

export async function deletePrayerPost(formData: FormData): Promise<void> {
  const s = await memberSession();
  if (!s) return;
  const { error } = await s.supabase
    .from("prayer_wall_posts")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("author_id", s.user.id);
  if (error) console.error("deletePrayerPost failed", error);
  revalidatePath("/prayer-wall");
}

/** Hide or unhide a post or reply. Row-level security limits this to moderators. */
export async function setPrayerItemHidden(formData: FormData): Promise<void> {
  const s = await memberSession();
  const target = parseTarget(formData.get("target"));
  if (!s || !target) return;
  const hide = formData.get("hide") === "1";
  const { error } = await s.supabase
    .from(target.kind === "post" ? "prayer_wall_posts" : "prayer_wall_replies")
    .update({
      hidden_at: hide ? new Date().toISOString() : null,
      hidden_by: hide ? s.user.id : null,
    })
    .eq("id", target.id);
  if (error) console.error("setPrayerItemHidden failed", error);
  revalidatePath("/prayer-wall");
}

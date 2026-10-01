"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentUser, memberHasRole } from "@/lib/auth/session";
import { setMemberScreenName } from "@/lib/auth/profile";
import {
  bodyProblem,
  cleanBody,
  isTopic,
  MODERATOR_ROLES,
  normalizeScreenName,
  safeNext,
  SCREEN_NAME_RULE,
  screenNameProblem,
} from "@/lib/prayer-wall";
import { SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Prayer Wall writes. They run with the service role, so this file holds the
 * rules the member policies in 0005_screen_names_and_prayer_wall.sql used to:
 * the author is always the signed-in member, members delete only their own
 * posts, and only moderators hide anything. Names and expiry are still stamped
 * by the database's triggers.
 */

export interface WallResult {
  ok: boolean;
  error?: string;
}

const GENERIC = "Something went wrong on our end. Try again in a moment.";

async function memberSession() {
  const user = await currentUser();
  return user ? { db: supabaseAdmin(), user } : null;
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

  const error = await setMemberScreenName(s.user.id, normalizeScreenName(raw));
  if (error === "taken") return { ok: false, error: "That screen name is taken. Try another." };
  if (error === "format") return { ok: false, error: SCREEN_NAME_RULE };
  if (error) return { ok: false, error: GENERIC };

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
  const rawTopic = formData.get("topic");
  const topic = isTopic(rawTopic) ? rawTopic : null;

  const { error } = await s.db
    .from("prayer_wall_posts")
    .insert({ satellite_id: SATELLITE_ID, author_id: s.user.id, body, topic });
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

  const { error } = await s.db
    .from("prayer_wall_replies")
    .insert({ post_id: postId, author_id: s.user.id, kind, body });
  if (error) return { ok: false, error: wallError(error, "replyToPrayer") };

  revalidatePath("/prayer-wall");
  return { ok: true };
}

/**
 * "I prayed": one tap adds the member to a request's count, a second tap takes
 * it back. Only open requests (not hidden, not expired) can be prayed for.
 */
export async function togglePrayed(postId: string): Promise<WallResult> {
  const s = await memberSession();
  if (!s) return { ok: false, error: "Sign in to pray for this request." };

  const { data: open } = await s.db
    .from("prayer_wall_posts")
    .select("id")
    .eq("id", postId)
    .eq("satellite_id", SATELLITE_ID)
    .is("hidden_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!open) return { ok: false, error: "That prayer request is no longer open." };

  const mine = { post_id: postId, member_id: s.user.id };
  const { data: removed, error: delError } = await s.db
    .from("prayer_wall_prayers")
    .delete()
    .match(mine)
    .select("post_id");
  if (delError) {
    console.error("togglePrayed: delete failed", delError);
    return { ok: false, error: GENERIC };
  }
  if (!removed?.length) {
    const { error } = await s.db.from("prayer_wall_prayers").insert(mine);
    // A double tap that raced itself is still "prayed".
    if (error && error.code !== "23505") {
      console.error("togglePrayed: insert failed", error);
      return { ok: false, error: GENERIC };
    }
  }

  revalidatePath("/prayer-wall");
  return { ok: true };
}

/** The author marks their own request answered (a praise report), or undoes it. */
export async function markAnswered(formData: FormData): Promise<void> {
  const s = await memberSession();
  if (!s) return;
  const answered = formData.get("answered") === "1";
  const { error } = await s.db
    .from("prayer_wall_posts")
    .update({ answered_at: answered ? new Date().toISOString() : null })
    .eq("id", String(formData.get("id") ?? ""))
    .eq("author_id", s.user.id);
  if (error) console.error("markAnswered failed", error);
  revalidatePath("/prayer-wall");
}

export async function reportPrayerItem(
  _prev: WallResult | null,
  formData: FormData,
): Promise<WallResult> {
  const s = await memberSession();
  const target = parseTarget(formData.get("target"));
  if (!s || !target) return { ok: false, error: GENERIC };

  const { error } = await s.db.from("prayer_wall_reports").insert({
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
  const { error } = await s.db
    .from("prayer_wall_posts")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("author_id", s.user.id);
  if (error) console.error("deletePrayerPost failed", error);
  revalidatePath("/prayer-wall");
}

/** Hide or unhide a post or reply. Moderators of the item's satellite only. */
export async function setPrayerItemHidden(formData: FormData): Promise<void> {
  const s = await memberSession();
  const target = parseTarget(formData.get("target"));
  if (!s || !target) return;
  const table = target.kind === "post" ? "prayer_wall_posts" : "prayer_wall_replies";
  const { data: item } = await s.db.from(table).select("satellite_id").eq("id", target.id).maybeSingle();
  if (!item || !(await memberHasRole(s.user.id, item.satellite_id as string, MODERATOR_ROLES))) return;
  const hide = formData.get("hide") === "1";
  const { error } = await s.db
    .from(table)
    .update({
      hidden_at: hide ? new Date().toISOString() : null,
      hidden_by: hide ? s.user.id : null,
    })
    .eq("id", target.id);
  if (error) console.error("setPrayerItemHidden failed", error);
  revalidatePath("/prayer-wall");
}

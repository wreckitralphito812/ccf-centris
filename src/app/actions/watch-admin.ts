"use server";

import { revalidatePath, updateTag } from "next/cache";

import { CCF_NET_TAG } from "@/lib/ccf-net";

import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase/server";
import { videoIdFromInput } from "@/lib/watch-shared";

export interface WatchAdminResult {
  ok: boolean;
  message?: string;
  error?: string;
}

async function blocked(): Promise<string | null> {
  if (!isAdminConfigured()) return "Admin is read-only: no access code configured.";
  if (!(await isAdmin())) return "Sign in to the admin first.";
  if (!hasSupabase()) return "Not connected to the database.";
  return null;
}

function refresh() {
  revalidatePath("/watch");
  revalidatePath("/");
  revalidatePath("/admin/watch");
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const dateOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/**
 * Feature a video on the Watch page and the home page, in place of whatever
 * CCF Net is showing: a special service, or a replay CCF Net hasn't posted yet.
 * Works with unlisted videos. The title is read from YouTube when left blank.
 */
export async function pinVideo(_prev: WatchAdminResult | null, formData: FormData): Promise<WatchAdminResult> {
  const why = await blocked();
  if (why) return { ok: false, error: why };

  const id = videoIdFromInput(String(formData.get("url") ?? ""));
  if (!id) return { ok: false, error: "That doesn't look like a YouTube link. Paste the video's link or its 11-character ID." };

  let title = clean(formData.get("title"), 200);
  if (!title) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      );
      if (res.ok) title = String(((await res.json()) as { title?: string }).title ?? "").split("|")[0].trim();
    } catch {
      // Fall through to the check below.
    }
  }
  if (!title) return { ok: false, error: "YouTube didn't give us a title for that video. Type one in." };

  const db = supabaseAdmin();
  await db.from("watch_replays").update({ pinned: false }).eq("pinned", true);
  const { error } = await db.from("watch_replays").upsert(
    {
      video_id: id,
      title,
      speaker: clean(formData.get("speaker"), 120) || null,
      service_date: dateOrNull(formData.get("service_date")),
      source: "manual",
      hidden: false,
      pinned: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "video_id" },
  );
  if (error) {
    console.error("pinVideo failed", error);
    return { ok: false, error: "Couldn't save that video. Try again." };
  }
  refresh();
  return { ok: true, message: `Now featuring “${title}”.` };
}

/** Stop featuring the pinned video; the site follows CCF Net again. */
export async function unpinVideo(): Promise<void> {
  if (await blocked()) return;
  await supabaseAdmin().from("watch_replays").update({ pinned: false }).eq("pinned", true);
  refresh();
}

/** Feature a replay that's already in the library. */
export async function pinExisting(formData: FormData): Promise<void> {
  if (await blocked()) return;
  const id = String(formData.get("id") ?? "");
  const db = supabaseAdmin();
  await db.from("watch_replays").update({ pinned: false }).eq("pinned", true);
  await db.from("watch_replays").update({ pinned: true, hidden: false }).eq("video_id", id);
  refresh();
}

/** Fix a replay's title, speaker or date. */
export async function updateReplay(formData: FormData): Promise<void> {
  if (await blocked()) return;
  const title = clean(formData.get("title"), 200);
  if (!title) return;
  const { error } = await supabaseAdmin()
    .from("watch_replays")
    .update({
      title,
      speaker: clean(formData.get("speaker"), 120) || null,
      service_date: dateOrNull(formData.get("service_date")),
      updated_at: new Date().toISOString(),
    })
    .eq("video_id", String(formData.get("id") ?? ""));
  if (error) console.error("updateReplay failed", error);
  refresh();
}

/** Hide a replay from the site, or show it again. */
export async function setReplayHidden(formData: FormData): Promise<void> {
  if (await blocked()) return;
  const hidden = formData.get("hidden") === "true";
  await supabaseAdmin()
    .from("watch_replays")
    .update({ hidden, ...(hidden ? { pinned: false } : {}), updated_at: new Date().toISOString() })
    .eq("video_id", String(formData.get("id") ?? ""));
  refresh();
}

/** Look at CCF Net again now, instead of waiting for the half-hourly check. */
export async function checkCcfNetNow(): Promise<void> {
  if (await blocked()) return;
  updateTag(CCF_NET_TAG);
  refresh();
}

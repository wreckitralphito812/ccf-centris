"use server";

import { isOurUpload } from "@/lib/announcements";
import { adminWriteBlocked, refreshEventPages } from "@/lib/admin-events";
import { SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * The quick actions on the admin events list (2026-10-08): add or change a
 * poster without opening the form, hide or show an event, and delete one.
 * Adding or editing the details goes through `adminSaveEvent`.
 */

export interface EventActionResult {
  ok: boolean;
  error?: string;
}

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Set (or, with an empty url, remove) the poster shown on the website. */
export async function setEventPoster(id: string, url: string): Promise<EventActionResult> {
  const blocked = await adminWriteBlocked();
  if (blocked) return { ok: false, error: blocked };
  if (!isId(id)) return { ok: false, error: "Unknown event." };
  if (url && !isOurUpload(url)) return { ok: false, error: "The poster didn't upload properly. Try again." };

  const db = supabaseAdmin();
  const { data: current } = await db.from("events").select("artwork").eq("id", id).eq("satellite_id", SATELLITE_ID).maybeSingle();
  // Removing the poster falls back to the ministry's Main Hall TV file, if any.
  const fallback = (current?.artwork as Record<string, string> | null)?.main_tv ?? null;
  const { data, error } = await db
    .from("events")
    .update({ cover_image_url: url || fallback, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .select("slug")
    .maybeSingle();
  if (error || !data) {
    console.error("setEventPoster failed", error);
    return { ok: false, error: "Couldn't save the poster. Try again." };
  }
  refreshEventPages(data.slug as string);
  return { ok: true };
}

/** Show an event on the site, or hide it (status `draft`) without deleting it. */
export async function setEventVisibility(id: string, show: boolean): Promise<EventActionResult> {
  const blocked = await adminWriteBlocked();
  if (blocked) return { ok: false, error: blocked };
  if (!isId(id)) return { ok: false, error: "Unknown event." };
  const { data, error } = await supabaseAdmin()
    .from("events")
    .update({ status: show ? "published" : "draft", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .select("slug")
    .maybeSingle();
  if (error || !data) {
    console.error("setEventVisibility failed", error);
    return { ok: false, error: "Couldn't change it. Try again." };
  }
  refreshEventPages(data.slug as string);
  return { ok: true };
}

/** Delete an event and its dates for good. */
export async function deleteEvent(id: string): Promise<EventActionResult> {
  const blocked = await adminWriteBlocked();
  if (blocked) return { ok: false, error: blocked };
  if (!isId(id)) return { ok: false, error: "Unknown event." };
  const { data, error } = await supabaseAdmin()
    .from("events")
    .delete()
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .select("slug")
    .maybeSingle();
  if (error || !data) {
    console.error("deleteEvent failed", error);
    return { ok: false, error: "Couldn't delete it. Try again." };
  }
  refreshEventPages(data.slug as string);
  return { ok: true };
}

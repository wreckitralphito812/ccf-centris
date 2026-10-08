"use server";

import { isOurUpload, signupUrlFrom } from "@/lib/announcements";
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
  /** The sign-up link saved from the poster's QR code, if one was. */
  signupAdded?: string;
}

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/**
 * Set (or, with an empty url, remove) the poster shown on the website. When
 * the browser read a sign-up link from a QR code on it (2026-10-08) and the
 * event has none yet, that link is saved too; an existing link is never
 * replaced from here.
 */
export async function setEventPoster(id: string, url: string, qrLink?: string | null): Promise<EventActionResult> {
  const blocked = await adminWriteBlocked();
  if (blocked) return { ok: false, error: blocked };
  if (!isId(id)) return { ok: false, error: "Unknown event." };
  if (url && !isOurUpload(url)) return { ok: false, error: "The poster didn't upload properly. Try again." };

  const db = supabaseAdmin();
  const { data: current } = await db
    .from("events")
    .select("artwork, registration_url, calendar_only")
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .maybeSingle();
  // Removing the poster falls back to the ministry's Main Hall TV file, if any.
  const fallback = (current?.artwork as Record<string, string> | null)?.main_tv ?? null;
  const signup = url && current && !current.registration_url && !current.calendar_only ? signupUrlFrom(qrLink) : null;
  const { data, error } = await db
    .from("events")
    .update({
      cover_image_url: url || fallback,
      ...(signup ? { registration_url: signup, requires_registration: true } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .select("slug")
    .maybeSingle();
  if (error || !data) {
    console.error("setEventPoster failed", error);
    return { ok: false, error: "Couldn't save the poster. Try again." };
  }
  refreshEventPages(data.slug as string);
  return { ok: true, ...(signup ? { signupAdded: signup } : {}) };
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

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { currentUser } from "@/lib/auth/session";
import { getMemberProfile } from "@/lib/auth/profile";
import { lastEnd, parseAnnouncement, slugFor, type AnnouncementErrors } from "@/lib/announcements";
import { sendEmail, siteOrigin } from "@/lib/email";
import { adminAnnouncementEmail, announcementEmail } from "@/lib/emails/announcement";
import { manilaDateKey } from "@/lib/format";
import { getMyAnnouncement, getRepStatus } from "@/lib/queries";
import { CONTACT } from "@/lib/site";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Announcements, the ministry side (2026-10-05). Approved reps submit; an
 * admin reviews in /admin/announcements. Everything is written with the
 * service role, always scoped to the signed-in member.
 */

export interface AnnounceResult {
  ok: boolean;
  formError?: string;
  errors?: AnnouncementErrors;
  message?: string;
}

const GENERIC = "Something went wrong on our end. Try again in a moment.";
const inbox = () => process.env.ANNOUNCEMENTS_EMAIL || CONTACT.messageEmail;

function refresh() {
  for (const p of ["/announce", "/admin/announcements", "/events", "/events/calendar"]) revalidatePath(p);
}

/** Ask to be allowed to post. The admin inbox is told. */
export async function requestAnnouncementAccess(_prev: AnnounceResult | null, fd: FormData): Promise<AnnounceResult> {
  if (!hasSupabase()) return { ok: false, formError: GENERIC };
  const user = await currentUser();
  if (!user?.email) return { ok: false, formError: "Sign in first." };

  const ministry = String(fd.get("ministry") ?? "").trim().slice(0, 80);
  if (ministry.length < 2) return { ok: false, formError: "Tell us which ministry you post for." };

  if ((await getRepStatus(user.email)) !== "none") return { ok: true, message: "Your request is in." };
  const profile = await getMemberProfile(user.id);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.full_name || null;

  const { error } = await supabaseAdmin()
    .from("announcement_reps")
    .insert({ satellite_id: SATELLITE_ID, email: user.email, name, ministry });
  if (error && error.code !== "23505") {
    console.error("requestAnnouncementAccess failed", error);
    return { ok: false, formError: GENERIC };
  }
  await sendEmail({
    to: inbox(),
    ...adminAnnouncementEmail({ kind: "access", origin: siteOrigin(), who: name ? `${name} <${user.email}>` : user.email, ministry }),
  });
  revalidatePath("/announce");
  revalidatePath("/admin/announcements");
  return { ok: true, message: "Request sent. You'll get an email once you're added." };
}

/**
 * Submit a new announcement, or change one of your own (`id`). Either way it
 * goes (back) to the review queue, and the admin inbox is told.
 */
export async function submitAnnouncement(_prev: AnnounceResult | null, fd: FormData): Promise<AnnounceResult> {
  if (!hasSupabase()) return { ok: false, formError: GENERIC };
  const user = await currentUser();
  if (!user?.email) return { ok: false, formError: "Sign in again to send this." };
  if ((await getRepStatus(user.email)) !== "approved") {
    return { ok: false, formError: "Only approved ministry reps can post. Ask for access first." };
  }

  const parsed = parseAnnouncement(fd, manilaDateKey());
  if (!parsed.ok) return { ok: false, errors: parsed.errors, formError: "A few things need fixing below." };
  const a = parsed.value;

  const editId = String(fd.get("id") ?? "").trim();
  const existing = editId ? await getMyAnnouncement(user.id, editId) : null;
  if (editId && !existing) return { ok: false, formError: "That announcement can't be changed any more." };

  const id = existing?.id ?? randomUUID();
  const first = a.dates[0];
  const row = {
    title: a.title,
    summary: a.summary,
    description: a.description,
    category: a.category,
    location_note: a.venue,
    organizer: a.ministry,
    ministry: a.ministry,
    starts_at: first.startsAt,
    ends_at: lastEnd(a.dates),
    registration_url: a.registrationUrl,
    requires_registration: Boolean(a.registrationUrl),
    fee_note: a.feeNote,
    price_cents: 0,
    artwork: a.artwork,
    cover_image_url: a.artwork.main_tv ?? null,
    status: "pending",
    review_note: null,
    updated_at: new Date().toISOString(),
  };

  const db = supabaseAdmin();
  const { error } = existing
    ? await db.from("events").update(row).eq("id", id).eq("submitted_by", user.id)
    : await db.from("events").insert({
        ...row,
        id,
        satellite_id: SATELLITE_ID,
        submitted_by: user.id,
        slug: slugFor(a.title, manilaDateKey(new Date(first.startsAt)), id),
      });
  if (error) {
    console.error("submitAnnouncement failed", error);
    return { ok: false, formError: GENERIC };
  }

  await db.from("event_dates").delete().eq("event_id", id);
  const { error: datesError } = await db
    .from("event_dates")
    .insert(a.dates.map((d) => ({ event_id: id, starts_at: d.startsAt, ends_at: d.endsAt, all_day: d.allDay })));
  if (datesError) console.error("submitAnnouncement: dates failed", datesError);

  const origin = siteOrigin();
  const profile = await getMemberProfile(user.id);
  const who = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email;
  await Promise.all([
    sendEmail({ to: inbox(), ...adminAnnouncementEmail({ kind: "waiting", origin, title: a.title, who, ministry: a.ministry }) }),
    sendEmail({ to: user.email, ...announcementEmail({ kind: "received", origin, title: a.title, slug: "" }) }),
  ]);

  refresh();
  return {
    ok: true,
    message: existing
      ? "Changes sent. It's back with the team for a quick review."
      : "Sent! The team will review it and email you within 2 working days.",
  };
}

/** Take back one of your own announcements, whether waiting or live. */
export async function withdrawAnnouncement(fd: FormData): Promise<void> {
  if (!hasSupabase()) return;
  const user = await currentUser();
  if (!user) return;
  const { error } = await supabaseAdmin()
    .from("events")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", String(fd.get("id") ?? ""))
    .eq("submitted_by", user.id)
    .eq("satellite_id", SATELLITE_ID);
  if (error) console.error("withdrawAnnouncement failed", error);
  refresh();
}

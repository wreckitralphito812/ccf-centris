"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { isOurUpload, lastEnd, parseAnnouncement, slugFor, type AnnouncementErrors } from "@/lib/announcements";
import { manilaDateKey } from "@/lib/format";

import { adminWriteBlocked, refreshEventPages } from "@/lib/admin-events";
import { sendEmail, siteOrigin } from "@/lib/email";
import { announcementEmail } from "@/lib/emails/announcement";
import { SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Announcements, the review side (2026-10-05): approve, send back for
 * changes, decline or take down an announcement, and manage who may post.
 * Every action checks the shared admin code first.
 */

export interface ReviewResult {
  ok: boolean;
  formError?: string;
  message?: string;
  errors?: AnnouncementErrors;
  /** The saved event, for the admin form's success links. */
  event?: { id: string; slug: string; status: string; calendarOnly: boolean };
}

async function guard(): Promise<ReviewResult | null> {
  const blocked = await adminWriteBlocked();
  return blocked ? { ok: false, formError: blocked } : null;
}

const refresh = refreshEventPages;

const STATUS = { approve: "published", changes: "changes_requested", decline: "declined", takedown: "cancelled" } as const;

/** Decide one announcement. Approve, changes and decline email the rep. */
export async function reviewAnnouncement(_prev: ReviewResult | null, fd: FormData): Promise<ReviewResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = String(fd.get("id") ?? "");
  const decision = String(fd.get("decision") ?? "") as keyof typeof STATUS;
  const note = String(fd.get("note") ?? "").trim().slice(0, 500) || null;
  if (!(decision in STATUS)) return { ok: false, formError: "Unknown decision." };
  if ((decision === "changes" || decision === "decline") && !note) {
    return { ok: false, formError: "Add a short note so the ministry knows what to change." };
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("events")
    .update({ status: STATUS[decision], review_note: note, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .select("title, slug, submitted_by")
    .maybeSingle();
  if (error || !data) {
    console.error("reviewAnnouncement failed", error);
    return { ok: false, formError: "Couldn't update it. Try again." };
  }

  if (decision !== "takedown" && data.submitted_by) {
    const { data: who } = await db.from("profiles").select("email").eq("id", data.submitted_by).maybeSingle();
    if (who?.email) {
      await sendEmail({
        to: who.email as string,
        ...announcementEmail({
          kind: decision === "approve" ? "approved" : decision === "changes" ? "changes" : "declined",
          origin: siteOrigin(),
          title: data.title as string,
          slug: data.slug as string,
          note,
        }),
      });
    }
  }

  refresh(data.slug as string);
  return {
    ok: true,
    message: {
      approve: "Approved. It's live on What's Happening.",
      changes: "Sent back with your note.",
      decline: "Declined. The ministry was told.",
      takedown: "Taken down.",
    }[decision],
  };
}

/** Let someone post: approve a request, or add a rep by email. */
export async function addAnnouncementRep(_prev: ReviewResult | null, fd: FormData): Promise<ReviewResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim().slice(0, 120) || null;
  const ministry = String(fd.get("ministry") ?? "").trim().slice(0, 80) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, formError: "Enter their email address." };

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("announcement_reps")
    .select("id")
    .eq("satellite_id", SATELLITE_ID)
    .ilike("email", email)
    .maybeSingle();
  const now = new Date().toISOString();
  const { error } = existing
    ? await db.from("announcement_reps").update({ approved_at: now, ...(name ? { name } : {}), ...(ministry ? { ministry } : {}) }).eq("id", existing.id)
    : await db.from("announcement_reps").insert({ satellite_id: SATELLITE_ID, email, name, ministry, approved_at: now });
  if (error) {
    console.error("addAnnouncementRep failed", error);
    return { ok: false, formError: "Couldn't add them. Try again." };
  }
  refresh();
  return { ok: true, message: `${email} can now post announcements. They sign in with this email.` };
}

/** Approve a pending access request (button in the list). */
export async function approveAnnouncementRep(fd: FormData): Promise<void> {
  if (await guard()) return;
  const { error } = await supabaseAdmin()
    .from("announcement_reps")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", String(fd.get("id") ?? ""))
    .eq("satellite_id", SATELLITE_ID);
  if (error) console.error("approveAnnouncementRep failed", error);
  refresh();
}

/** Remove a rep, or turn down a request. Their past announcements stay. */
export async function removeAnnouncementRep(fd: FormData): Promise<void> {
  if (await guard()) return;
  const { error } = await supabaseAdmin()
    .from("announcement_reps")
    .delete()
    .eq("id", String(fd.get("id") ?? ""))
    .eq("satellite_id", SATELLITE_ID);
  if (error) console.error("removeAnnouncementRep failed", error);
  refresh();
}

/**
 * Add or edit an event straight from the admin console, published at once
 * (Adrian's review, 2026-10-06): the team posts the church's own events
 * without the rep flow, artwork optional, and can mark a booking by another
 * satellite or pastor as calendar-only (on the month calendar, not promoted).
 */
export async function adminSaveEvent(_prev: ReviewResult | null, fd: FormData): Promise<ReviewResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const parsed = parseAnnouncement(fd, manilaDateKey(), { artworkRequired: false, allowPast: true, linkLater: true });
  if (!parsed.ok) return { ok: false, errors: parsed.errors, formError: "A few things need fixing below." };
  const a = parsed.value;
  const calendarOnly = fd.get("calendar_only") === "1";
  // The website poster can be any shape (2026-10-08); without one, the
  // ministry's Main Hall TV file stands in, as for reps' announcements.
  const posterField = String(fd.get("poster_url") ?? "").trim();
  if (posterField && !isOurUpload(posterField)) {
    return { ok: false, errors: { artwork: "The poster didn't upload properly. Upload it again." }, formError: "A few things need fixing below." };
  }
  // New events are published or saved hidden; an edit keeps the event's
  // current status unless the form says otherwise.
  const publish = fd.get("publish");
  const status = publish === "1" ? "published" : publish === "0" ? "draft" : null;

  const db = supabaseAdmin();
  const editId = String(fd.get("id") ?? "").trim();
  const id = editId || randomUUID();
  const row = {
    title: a.title,
    summary: a.summary,
    description: a.description,
    category: a.category,
    location_note: a.venue,
    organizer: a.ministry,
    ministry: a.ministry,
    starts_at: a.dates[0].startsAt,
    ends_at: lastEnd(a.dates),
    registration_url: calendarOnly ? null : a.registrationUrl,
    // Sign-up wanted but no link yet reads as "Sign-up opens soon" on the event page.
    requires_registration: !calendarOnly && a.signup,
    fee_note: a.feeNote,
    price_cents: 0,
    artwork: a.artwork,
    cover_image_url: posterField || a.artwork.main_tv || null,
    calendar_only: calendarOnly,
    ...(status || !editId ? { status: status ?? "published" } : {}),
    review_note: null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = editId
    ? await db.from("events").update(row).eq("id", id).eq("satellite_id", SATELLITE_ID).select("slug, status").maybeSingle()
    : await db
        .from("events")
        .insert({ ...row, id, satellite_id: SATELLITE_ID, slug: slugFor(a.title, manilaDateKey(new Date(a.dates[0].startsAt)), id) })
        .select("slug, status")
        .maybeSingle();
  if (error || !saved) {
    console.error("adminSaveEvent failed", error);
    return { ok: false, formError: "Couldn't save it. Try again." };
  }

  await db.from("event_dates").delete().eq("event_id", id);
  const { error: datesError } = await db
    .from("event_dates")
    .insert(a.dates.map((d) => ({ event_id: id, starts_at: d.startsAt, ends_at: d.endsAt, all_day: d.allDay })));
  if (datesError) console.error("adminSaveEvent: dates failed", datesError);

  refresh(saved.slug as string);
  // Back to the events list, scrolled to this event, so the next edit is one
  // tap away (Ralph, 2026-10-08). Past events live on the Past tab.
  const ended = lastEnd(a.dates) < new Date().toISOString();
  redirect(`/admin/events?${ended ? "view=past&" : ""}saved=${id}${editId ? "" : "&added=1"}`);
}

"use server";

import { revalidatePath } from "next/cache";

import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { sendEmail, siteOrigin } from "@/lib/email";
import { announcementEmail } from "@/lib/emails/announcement";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Announcements, the review side (2026-10-05): approve, send back for
 * changes, decline or take down an announcement, and manage who may post.
 * Every action checks the shared admin code first.
 */

export interface ReviewResult {
  ok: boolean;
  formError?: string;
  message?: string;
}

async function guard(): Promise<ReviewResult | null> {
  if (!isAdminConfigured()) return { ok: false, formError: "Admin is read-only: no access code configured." };
  if (!(await isAdmin())) return { ok: false, formError: "Not signed in." };
  if (!hasSupabase()) return { ok: false, formError: "Not connected to the database." };
  return null;
}

function refresh(slug?: string) {
  for (const p of ["/admin/announcements", "/announce", "/events", "/events/calendar", "/"]) revalidatePath(p);
  if (slug) revalidatePath(`/events/${slug}`);
}

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

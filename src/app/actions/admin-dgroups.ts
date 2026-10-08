"use server";

import { revalidatePath } from "next/cache";

import { adminWriteBlocked } from "@/lib/admin-events";
import { sendEmail, siteOrigin } from "@/lib/email";
import { dgroupDecisionEmail } from "@/lib/emails/dgroup";
import { SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * The Dgroup registry, the team's side (2026-10-08): approve a leader's
 * Dgroup, send it back with a note, decline it, or archive one that has
 * stopped meeting. Approve, changes and decline email the leader.
 */

export interface DgroupReviewResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const NEXT = {
  approve: "approved",
  changes: "changes_requested",
  decline: "declined",
  archive: "archived",
  restore: "approved",
} as const;

export async function reviewDgroup(_prev: DgroupReviewResult | null, fd: FormData): Promise<DgroupReviewResult> {
  const blocked = await adminWriteBlocked();
  if (blocked) return { ok: false, error: blocked };

  const id = String(fd.get("id") ?? "");
  const decision = String(fd.get("decision") ?? "") as keyof typeof NEXT;
  const note = String(fd.get("note") ?? "").trim().slice(0, 500) || null;
  if (!(decision in NEXT)) return { ok: false, error: "Unknown decision." };
  if ((decision === "changes" || decision === "decline") && !note) {
    return { ok: false, error: "Add a short note so the leader knows why." };
  }

  const { data, error } = await supabaseAdmin()
    .from("dgroups")
    .update({
      status: NEXT[decision],
      review_note: decision === "changes" || decision === "decline" ? note : null,
      reviewed_at: new Date().toISOString(),
      ...(decision === "archive" ? { is_open: false } : {}),
    })
    .eq("id", id)
    .eq("satellite_id", SATELLITE_ID)
    .select("name, leader_email")
    .maybeSingle();
  if (error || !data) {
    console.error("reviewDgroup failed", error);
    return { ok: false, error: "Couldn't update it. Try again." };
  }

  const kind = decision === "approve" ? "approved" : decision === "changes" ? "changes" : decision === "decline" ? "declined" : null;
  if (kind && data.leader_email) {
    await sendEmail({ to: data.leader_email as string, ...dgroupDecisionEmail({ kind, origin: siteOrigin(), name: data.name as string, note }) });
  }

  for (const p of ["/admin/dgroups", "/admin", "/my/dgroups", "/reserve/dgroup"]) revalidatePath(p);
  return {
    ok: true,
    message: {
      approve: "Approved. The leader was emailed.",
      changes: "Sent back with your note.",
      decline: "Declined. The leader was told.",
      archive: "Archived.",
      restore: "Restored.",
    }[decision],
  };
}

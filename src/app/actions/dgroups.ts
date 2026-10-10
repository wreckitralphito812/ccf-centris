"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { currentUser } from "@/lib/auth/session";
import { parseDgroup, scheduleText, type DgroupErrors } from "@/lib/dgroup-registry";
import { sendEmail, siteOrigin } from "@/lib/email";
import { adminDgroupEmail } from "@/lib/emails/dgroup";
import { CONTACT } from "@/lib/site";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";

/**
 * The Dgroup registry, the leader's side (2026-10-08). A signed-in member
 * registers the Dgroup they lead; the team approves it in /admin/dgroups.
 * Every write is scoped to the signed-in member's own Dgroups.
 */

export interface DgroupResult {
  ok: boolean;
  formError?: string;
  errors?: DgroupErrors;
}

const inbox = () => process.env.DGROUPS_EMAIL || CONTACT.messageEmail;

function refresh() {
  for (const p of ["/my/dgroups", "/admin/dgroups", "/admin", "/reserve/dgroup"]) revalidatePath(p);
}

/** Register a Dgroup, or save changes to one of this member's. */
export async function saveMyDgroup(_prev: DgroupResult | null, fd: FormData): Promise<DgroupResult> {
  if (!hasSupabase()) return { ok: false, formError: "Dgroup registration isn't switched on yet." };
  const user = await currentUser();
  if (!user) return { ok: false, formError: "Sign in again to save your Dgroup." };

  const parsed = parseDgroup(fd);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, formError: "A few things need fixing below." };
  const g = parsed.value;
  const row = {
    name: g.name,
    audience: g.audience,
    day_of_week: g.dayOfWeek,
    start_time: g.startTime,
    frequency: g.frequency,
    meets_where: g.meetsWhere,
    mode: g.meetsWhere === "online" ? "online" : "in_person",
    general_area: g.generalArea,
    current_size: g.currentSize,
    is_open: g.isOpen,
    leader_name: g.leaderName,
    leader_mobile: g.leaderMobile,
    leader_email: user.email,
    co_leader_name: g.coLeaderName,
    upline_name: g.uplineName,
    upline_mobile: g.uplineMobile,
    description: g.description,
    updated_at: new Date().toISOString(),
  };

  const db = supabaseAdmin();
  const id = String(fd.get("id") ?? "").trim();
  let savedId = id;
  let needsReview = false;

  if (id) {
    const { data: current } = await db
      .from("dgroups")
      .select("status")
      .eq("id", id)
      .eq("satellite_id", SATELLITE_ID)
      .eq("leader_id", user.id)
      .maybeSingle();
    if (!current) return { ok: false, formError: "That Dgroup can't be found." };
    // Sent back or turned down: saving sends it to the team again. An
    // approved group stays approved when its leader updates the details.
    needsReview = current.status === "changes_requested" || current.status === "declined";
    const { error } = await db
      .from("dgroups")
      .update({ ...row, ...(needsReview ? { status: "pending", review_note: null } : {}) })
      .eq("id", id)
      .eq("satellite_id", SATELLITE_ID)
      .eq("leader_id", user.id);
    if (error) {
      console.error("saveMyDgroup update failed", error);
      return { ok: false, formError: "Couldn't save it. Try again in a moment." };
    }
  } else {
    const { data, error } = await db
      .from("dgroups")
      .insert({ ...row, satellite_id: SATELLITE_ID, leader_id: user.id, status: "pending" })
      .select("id")
      .single();
    if (error || !data) {
      console.error("saveMyDgroup insert failed", error);
      return { ok: false, formError: "Couldn't save it. Try again in a moment." };
    }
    savedId = data.id as string;
    needsReview = true;
  }

  if (needsReview) {
    await sendEmail({
      to: inbox(),
      ...adminDgroupEmail({
        origin: siteOrigin(),
        name: g.name,
        leader: g.leaderName,
        schedule: scheduleText({ day_of_week: g.dayOfWeek, start_time: g.startTime, frequency: g.frequency }),
      }),
    });
  }
  refresh();
  redirect(`/my/dgroups?saved=${savedId}`);
}

/** "We've stopped meeting": takes the Dgroup off the list without deleting its history. */
export async function archiveMyDgroup(fd: FormData): Promise<void> {
  const user = await currentUser();
  if (!user || !hasSupabase()) return;
  const { error } = await supabaseAdmin()
    .from("dgroups")
    .update({ status: "archived", is_open: false, updated_at: new Date().toISOString() })
    .eq("id", String(fd.get("id") ?? ""))
    .eq("satellite_id", SATELLITE_ID)
    .eq("leader_id", user.id);
  if (error) console.error("archiveMyDgroup failed", error);
  refresh();
}

"use server";

import { bookingEmail } from "@/lib/emails/dgroup-booking";
import { roomRequestEmail } from "@/lib/emails/room-request";
import { referenceFor } from "@/lib/reference";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { sendEmail, siteOrigin } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabase, supabaseAdmin } from "@/lib/supabase/server";
import { ADMIN_COOKIE, hashCode, isAdmin, isAdminConfigured } from "@/lib/admin-auth";

export interface AdminActionResult {
  ok: boolean;
  formError?: string;
}

const RESERVATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed",
] as const;
const INQUIRY_STATUSES = [
  "new",
  "contacted",
  "joined",
  "declined",
  "closed",
] as const;
const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "accepted",
  "declined",
] as const;
/** Dgroup table booking statuses; bookings confirm at once since 0008. */
type DgroupTableStatus = "pending" | "confirmed" | "declined" | "cancelled";

type Enum<T extends readonly string[]> = T[number];

async function guard(): Promise<AdminActionResult | null> {
  if (!isAdminConfigured())
    return { ok: false, formError: "Admin is read-only: no access code configured." };
  if (!(await isAdmin())) return { ok: false, formError: "Not signed in." };
  if (!hasSupabase())
    return { ok: false, formError: "Not connected to the database." };
  return null;
}

async function setStatus(
  table: string,
  id: string,
  status: string,
  allowed: readonly string[],
  path: string,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!allowed.includes(status))
    return { ok: false, formError: "Unknown status." };

  const { error } = await supabaseAdmin()
    .from(table)
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error(`setStatus(${table}) failed`, error);
    return { ok: false, formError: "Update failed — try again." };
  }
  revalidatePath(path);
  return { ok: true };
}

/**
 * Decide a room request. Every room in the request moves together, and the
 * requester is emailed when it's approved, declined or cancelled.
 */
export async function setReservationStatus(
  id: string,
  status: Enum<typeof RESERVATION_STATUSES>,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!RESERVATION_STATUSES.includes(status)) return { ok: false, formError: "Unknown status." };

  const db = supabaseAdmin();
  const { data: row, error: readErr } = await db
    .from("reservations")
    .select("request_group")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !row) return { ok: false, formError: "That request could not be found." };

  const query = db.from("reservations").update({ status });
  const { data: rows, error } = await (row.request_group ? query.eq("request_group", row.request_group) : query.eq("id", id))
    .select(
      "contact_name, contact_email, contact_mobile, organization, activity_name, participants, during, layout, equipment, food, purpose, facilities(name)",
    );

  if (error) {
    if (error.code === "23P01")
      return { ok: false, formError: "Another request now holds one of these rooms at that time." };
    console.error("setReservationStatus failed", error);
    return { ok: false, formError: "Update failed. Try again." };
  }

  const first = rows?.[0];
  if (first && (status === "approved" || status === "rejected" || status === "cancelled")) {
    const m = /[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/.exec(first.during as string);
    const startsAt = m ? new Date(m[1]).toISOString() : "";
    const endsAt = m ? new Date(m[2]).toISOString() : "";
    const facilityName = (f: unknown) => (Array.isArray(f) ? f[0]?.name : (f as { name?: string } | null)?.name) ?? "Room";
    await sendEmail({
      to: first.contact_email as string,
      ...roomRequestEmail({
        kind: status,
        origin: siteOrigin(),
        reference: referenceFor("reservation", (row.request_group as string | null) ?? id),
        requester: first.contact_name as string,
        requesterEmail: first.contact_email as string,
        mobile: (first.contact_mobile as string | null) ?? null,
        activity: (first.activity_name as string | null) ?? "Your event",
        ministry: (first.organization as string | null) ?? "",
        rooms: rows!.map((r) => facilityName(r.facilities)),
        when: m ? `${fmtDayLong(startsAt)}, ${fmtTime(startsAt)} to ${fmtTime(endsAt)}` : "",
        participants: first.participants as number,
        setup: (first.layout as string | null) ?? null,
        equipment: (first.equipment as Record<string, number> | null) ?? null,
        food: (first.food as string | null) ?? null,
        notes: (first.purpose as string | null) ?? null,
      }),
    });
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/my/reservations");
  revalidatePath("/centris/reserve");
  return { ok: true };
}

export async function setInquiryStatus(
  id: string,
  status: Enum<typeof INQUIRY_STATUSES>,
) {
  return setStatus(
    "dgroup_inquiries",
    id,
    status,
    INQUIRY_STATUSES,
    "/admin/dgroups",
  );
}

export async function setApplicationStatus(
  id: string,
  status: Enum<typeof APPLICATION_STATUSES>,
) {
  return setStatus(
    "volunteer_applications",
    id,
    status,
    APPLICATION_STATUSES,
    "/admin/volunteers",
  );
}

/**
 * Cancel a Dgroup table booking from the admin list, e.g. a no-show or a
 * booking that breaks the policies. Its tables are released at once (a trigger
 * deletes the holds) and the leader is emailed that it was cancelled.
 */
export async function setDgroupTableStatus(
  id: string,
  status: DgroupTableStatus,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (status !== "cancelled") return { ok: false, formError: "Bookings can only be cancelled here." };

  const { data, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .update({ status, decided_at: new Date().toISOString(), cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["pending", "confirmed"])
    .select("leader_name, leader_email, room_slug, table_labels, booked_on, slot_id, group_size")
    .maybeSingle();

  if (error) {
    console.error("setDgroupTableStatus failed", error);
    return { ok: false, formError: "Update failed. Try again." };
  }
  if (data?.leader_email) {
    await sendEmail({
      to: data.leader_email as string,
      ...bookingEmail({
        kind: "cancelled",
        origin: siteOrigin(),
        leaderName: data.leader_name as string,
        roomSlug: data.room_slug as string,
        labels: data.table_labels as string[],
        date: data.booked_on as string,
        slotId: data.slot_id as string,
        groupSize: data.group_size as number,
      }),
    });
  }
  revalidatePath("/admin/dgroup-tables");
  revalidatePath("/reserve/dgroup");
  return { ok: true };
}

// --- Session ------------------------------------------------------------

export async function adminLogin(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const code = process.env.ADMIN_ACCESS_CODE;
  if (!code)
    return { ok: false, formError: "No access code is configured for this site." };

  const entered = String(formData.get("code") ?? "");
  if (entered !== code) return { ok: false, formError: "That code is not right." };

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, hashCode(code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin");
}

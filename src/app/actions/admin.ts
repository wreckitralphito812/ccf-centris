"use server";

import { bookingEmail } from "@/lib/emails/dgroup-booking";
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

export async function setReservationStatus(
  id: string,
  status: Enum<typeof RESERVATION_STATUSES>,
) {
  return setStatus(
    "reservations",
    id,
    status,
    RESERVATION_STATUSES,
    "/admin/reservations",
  );
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

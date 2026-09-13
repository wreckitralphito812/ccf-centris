"use server";

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
/** A Dgroup table request. 'confirmed' is the approved state; see 0007. */
const DGROUP_TABLE_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
] as const;

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
 * Approve or decline a Dgroup table request.
 *
 * Declining releases the table: the unique indexes only hold on 'pending' and
 * 'confirmed', so the moment this row goes to 'declined' the table is free for
 * the next request that night. Stamps decided_at so the queue can show when.
 *
 * Approving can still fail, and should: if the table was freed and retaken
 * while the request sat in the queue, the unique index rejects the update
 * rather than double-booking the table. That surfaces as an "Update failed"
 * note on the row.
 */
export async function setDgroupTableStatus(
  id: string,
  status: Enum<typeof DGROUP_TABLE_STATUSES>,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!DGROUP_TABLE_STATUSES.includes(status))
    return { ok: false, formError: "Unknown status." };

  const { error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .update({
      status,
      decided_at: status === "pending" ? null : new Date().toISOString(),
      ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);

  if (error) {
    console.error("setDgroupTableStatus failed", error);
    return {
      ok: false,
      formError:
        error.code === "23505"
          ? "That table was taken while this sat in the queue. Decline it and the leader can request again."
          : "Update failed — try again.",
    };
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

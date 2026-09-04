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

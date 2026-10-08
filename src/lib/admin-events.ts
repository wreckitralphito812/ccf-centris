import "server-only";

import { revalidatePath } from "next/cache";

import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";

/**
 * Shared by the admin event and announcement actions (2026-10-08): the
 * admin-code check every write starts with, and the pages to refresh after
 * an event changes.
 */

/** Why an admin write can't go ahead, or null when it can. */
export async function adminWriteBlocked(): Promise<string | null> {
  if (!isAdminConfigured()) return "Admin is read-only: no access code configured.";
  if (!(await isAdmin())) return "Your admin sign-in has expired. Sign in again.";
  if (!hasSupabase()) return "Not connected to the database.";
  return null;
}

/** Every page that shows events. */
export function refreshEventPages(slug?: string) {
  for (const p of ["/admin/events", "/admin/announcements", "/admin/today", "/announce", "/events", "/events/calendar", "/"]) revalidatePath(p);
  if (slug) revalidatePath(`/events/${slug}`);
}

import type { Metadata } from "next";
import { EventsManager } from "./list";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminEvents, getAnnouncementQueue } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

/**
 * The events manager (2026-10-08), replacing the template's demo table whose
 * Edit / Attendees / Check-in buttons never did anything. Everything on
 * What's Happening and the calendar, with the poster up front: add or change
 * it by dropping a file on it, edit the details, hide, show or delete.
 * Reps' submissions still in review stay on Announcements.
 */

export default async function AdminEvents({ searchParams }: PageProps<"/admin/events">) {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const [all, queue] = await Promise.all([getAdminEvents(), getAnnouncementQueue()]);
  const waiting = queue.filter((e) => e.status === "pending").length;

  return (
    <EventsManager
      all={all}
      waiting={waiting}
      view={typeof sp.view === "string" ? sp.view : undefined}
      q={q}
      readOnly={readOnly}
      notice={!hasSupabase() ? "Not connected to a database." : noCode ? "Read-only: no admin code is configured." : undefined}
    />
  );
}

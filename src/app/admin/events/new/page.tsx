import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote } from "../../admin-ui";
import { AnnounceForm } from "@/app/announce/announce-form";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add event" };
export const dynamic = "force-dynamic";

/** Add an event from the admin console (2026-10-08). */
export default async function AdminAddEvent() {
  const { readOnly } = await requireAdmin();
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/events" className="text-[0.92rem] font-semibold text-clay hover:text-clay-deep">
        ← Events
      </Link>
      <AdminHeader title="Add event" lead="Put an event on What's Happening, or a booking on the calendar only." />
      {readOnly || !hasSupabase() ? <AdminNote>Sign in with the admin code to add events.</AdminNote> : <AnnounceForm admin />}
    </div>
  );
}

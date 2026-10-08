import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, AdminNote } from "../../admin-ui";
import { AnnounceForm } from "@/app/announce/announce-form";
import { initialFrom } from "@/app/announce/initial";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminEvent } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit event" };
export const dynamic = "force-dynamic";

/** Edit one event from the admin console (2026-10-08). */
export default async function AdminEditEvent({ params }: PageProps<"/admin/events/[id]">) {
  const { readOnly } = await requireAdmin();
  const { id } = await params;
  const e = await getAdminEvent(id);
  if (!e) notFound();
  const live = e.status === "published" && !e.calendar_only && (e.ends_at ?? e.starts_at) >= new Date().toISOString();
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/events" className="text-[0.92rem] font-semibold text-clay hover:text-clay-deep">
        ← Events
      </Link>
      <AdminHeader
        title={e.title}
        lead={e.status === "published" ? "Changes show on the site as soon as you save." : "This event is hidden. Saving keeps it hidden."}
        action={
          live ? (
            <a
              href={`/events/${e.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-edge bg-paper-bright px-4 font-semibold text-ink hover:border-clay"
            >
              View on site ↗
            </a>
          ) : null
        }
      />
      {readOnly || !hasSupabase() ? <AdminNote>Sign in with the admin code to edit events.</AdminNote> : <AnnounceForm key={e.id} admin initial={initialFrom(e)} />}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, Status } from "../../admin-ui";
import { QueueActions } from "../../queue-actions";
import { RoomEditForm } from "./edit-form";
import { setReservationStatus } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { manilaMinutesOf, roomFor, roomLabel } from "@/lib/admin-day";
import { fmtDayLong, fmtTime, manilaDateKey } from "@/lib/format";
import { equipmentSummary, foodLabel, setupLabel, tablesSummary, toHHMM } from "@/lib/ministry-rooms";
import { getRoomRequest } from "@/lib/queries";
import { referenceFor } from "@/lib/reference";
import type { RoomRequestDetails } from "@/lib/room-edit";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Room request" };
export const dynamic = "force-dynamic";

/**
 * One room request, every detail the ministry gave, and (while it's waiting
 * or approved) the form to change it (Adrian, 2026-10-16). Every booking on
 * Today, This week and the Room calendar opens here.
 */
export default async function RoomRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const { id } = await params;
  const rows = await getRoomRequest(id);
  const r = rows[0];

  if (!r) {
    return (
      <div className="space-y-6">
        <AdminHeader title="Room request" />
        <AdminNote>That request could not be found. It may have been changed; find it again on Room requests.</AdminNote>
        <Link href="/admin/reservations" className="font-semibold text-clay underline underline-offset-4">
          ← Room requests
        </Link>
      </div>
    );
  }

  const rooms = rows.map(roomLabel);
  const editable = r.status === "pending" || r.status === "approved";
  const past = r.ends_at < new Date().toISOString();
  const initial: RoomRequestDetails = {
    rooms: rows.map((x) => roomFor(x)?.slug).filter((s): s is string => Boolean(s)),
    date: manilaDateKey(new Date(r.starts_at)),
    start: toHHMM(manilaMinutesOf(r.starts_at)),
    end: toHHMM(manilaMinutesOf(r.ends_at)),
    activity_name: r.activity_name ?? "",
    organization: r.organization ?? "",
    participants: r.participants,
    layout: r.layout ?? "",
    tables: r.tables ?? {},
    equipment: r.equipment ?? {},
    food: r.food ?? "",
    purpose: r.purpose ?? "",
    contact_name: r.contact_name,
    contact_email: r.contact_email,
    contact_mobile: r.contact_mobile ?? "",
  };
  const details: [string, string][] = [
    ["When", `${fmtDayLong(r.starts_at)}, ${fmtTime(r.starts_at)} – ${fmtTime(r.ends_at)}`],
    [rooms.length > 1 ? "Rooms" : "Room", rooms.join(", ")],
    ["People", String(r.participants)],
    ["Set-up", r.layout ? setupLabel(r.layout) : "Not said"],
    ...(r.layout === "tables" ? ([["Tables", tablesSummary(r.tables)]] as [string, string][]) : []),
    ["Equipment", equipmentSummary(r.equipment)],
    ["Food", foodLabel(r.food)],
    ["Notes", r.purpose || "None"],
    ["Asked by", [r.contact_name, r.organization].filter(Boolean).join(", ")],
    ["Email", r.contact_email],
    ["Mobile", r.contact_mobile || "Not given"],
    ["Reference", referenceFor("reservation", r.request_group ?? r.id)],
    ["Asked on", fmtDayLong(r.created_at)],
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/reservations" className="text-[0.92rem] font-semibold text-clay underline underline-offset-4">
        ← Room requests
      </Link>
      <AdminHeader
        title={r.activity_name ?? "Room request"}
        lead={editable ? "Everything the ministry asked for. Change anything below and save; they'll get an email saying what changed." : "Everything the ministry asked for."}
        action={<Status value={r.status === "approved" && past ? "completed" : r.status} />}
      />

      <dl className="grid gap-x-8 gap-y-3 rounded-xl border border-hairline bg-paper-bright p-5 sm:grid-cols-2 sm:p-6">
        {details.map(([k, v]) => (
          <div key={k} className="flex gap-3 border-b border-rule pb-2 last:border-0">
            <dt className="w-28 shrink-0 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-ink-mute">{k}</dt>
            <dd className="min-w-0 text-[0.98rem] text-ink [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.95rem] font-semibold text-ink">Decision:</span>
          <QueueActions
            id={r.id}
            current={r.status}
            transitions={
              r.status === "pending"
                ? [
                    { label: "Approve", status: "approved", tone: "go", confirm: "Approve this request? The person who asked will get an email." },
                    { label: "Decline", status: "rejected", tone: "stop", confirm: "Decline this request? The person who asked will get an email, and the rooms are freed." },
                  ]
                : r.status === "approved" && !past
                  ? [{ label: "Cancel booking", status: "cancelled", tone: "stop", confirm: "Cancel this booking? The person who asked will get an email, and the rooms are freed." }]
                  : !past
                    ? [{ label: "Reopen", status: "pending", confirm: "Put this request back in \"Waiting for you\"? It will hold its rooms again." }]
                    : []
            }
            onSet={setReservationStatus}
          />
        </div>
      )}

      {editable && !readOnly ? (
        <section aria-labelledby="edit-h" className="space-y-3">
          <h2 id="edit-h" className="font-display text-xl font-bold">
            Change this request
          </h2>
          <RoomEditForm id={r.id} initial={initial} />
        </section>
      ) : null}
    </div>
  );
}

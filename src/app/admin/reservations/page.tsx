import type { Metadata } from "next";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  Stat,
  Status,
  Table,
  Td,
} from "../admin-ui";
import { QueueActions } from "../queue-actions";
import { getReservations, type AdminReservation } from "@/lib/queries";
import { setReservationStatus } from "@/app/actions/admin";
import { hasSupabase } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/admin-auth";
import { fmtDayShort, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Reservations" };

export default async function AdminReservations() {
  const reservations = await getReservations();

  const pending = reservations.filter((r) => r.status === "pending");
  const approved = reservations.filter((r) => r.status === "approved");
  const past = reservations.filter(
    (r) => !["pending", "approved"].includes(r.status),
  );

  const readOnly = !isAdminConfigured() || !hasSupabase();

  const row = (
    r: AdminReservation,
    transitions: Parameters<typeof QueueActions>[0]["transitions"],
  ) => (
    <tr key={r.id}>
      <Td>
        <span className="font-semibold">{r.facility_name ?? "—"}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {r.court_name ?? r.activity_name ?? "—"}
        </span>
      </Td>
      <Td>
        <span className="font-semibold">{r.contact_name}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {r.contact_email}
          {r.contact_mobile ? ` · ${r.contact_mobile}` : ""}
          {r.organization ? ` · ${r.organization}` : ""}
        </span>
      </Td>
      <Td>
        {fmtDayShort(r.starts_at)}
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {fmtTime(r.starts_at)} – {fmtTime(r.ends_at)}
        </span>
      </Td>
      <Td className="tabular-nums">{r.participants}</Td>
      <Td>
        <Status value={r.status} />
      </Td>
      <Td>
        {readOnly ? (
          <span className="label text-ink-mute">Read-only</span>
        ) : (
          <QueueActions
            id={r.id}
            current={r.status}
            transitions={transitions}
            onSet={setReservationStatus}
          />
        )}
      </Td>
    </tr>
  );

  const cols = ["Space", "Requested by", "When", "Party", "Status", "Actions"];

  const empty = (msg: string) => (
    <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">{msg}</p>
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Reservations"
        lead="Room and court requests arrive here as pending. Approving one holds the slot; the database blocks any overlap."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live reservations.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Awaiting approval" value={pending.length} tone="clay" />
        <Stat label="Confirmed upcoming" value={approved.length} tone="moss" />
        <Stat label="Closed" value={past.length} />
      </div>

      <AdminPanel title="Awaiting approval">
        {pending.length
          ? (
            <Table columns={cols}>
              {pending.map((r) =>
                row(r, [
                  { label: "Approve", status: "approved", tone: "go" },
                  { label: "Reject", status: "rejected", tone: "stop" },
                ]),
              )}
            </Table>
          )
          : empty("Nothing waiting on a decision.")}
      </AdminPanel>

      <AdminPanel title="Confirmed">
        {approved.length
          ? (
            <Table columns={cols}>
              {approved.map((r) =>
                row(r, [
                  { label: "Mark completed", status: "completed" },
                  { label: "Cancel", status: "cancelled", tone: "stop" },
                ]),
              )}
            </Table>
          )
          : empty("No confirmed bookings ahead.")}
      </AdminPanel>

      <AdminPanel title="Closed">
        {past.length
          ? (
            <Table columns={cols}>
              {past.map((r) =>
                row(r, [{ label: "Reopen as pending", status: "pending" }]),
              )}
            </Table>
          )
          : empty("Nothing yet.")}
      </AdminPanel>

      <AdminNote>
        Double-booking is prevented by the database itself, not by this screen.
        A Postgres exclusion constraint rejects any overlapping reservation on
        the same court or hall, so two people clicking at the same moment cannot
        both succeed.
      </AdminNote>
    </div>
  );
}

import type { Metadata } from "next";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  RowActions,
  Stat,
  Status,
  Table,
  Td,
} from "../admin-ui";
import { getMyReservations } from "@/lib/queries";
import { fmtDayShort, fmtPeso, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Reservations" };

export default async function AdminReservations() {
  const reservations = await getMyReservations();

  const pending = reservations.filter((r) => r.status === "pending");
  const approved = reservations.filter((r) => r.status === "approved");
  const past = reservations.filter(
    (r) => r.status === "completed" || r.status === "cancelled",
  );

  const row = (r: (typeof reservations)[number], actions: string[]) => (
    <tr key={r.id}>
      <Td>
        <span className="font-semibold">{r.facility_name}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {r.court_name ?? r.activity_name ?? "—"}
        </span>
      </Td>
      <Td>
        {fmtDayShort(r.starts_at)}
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {fmtTime(r.starts_at)} – {fmtTime(r.ends_at)}
        </span>
      </Td>
      <Td className="tabular-nums">{r.participants}</Td>
      <Td className="tabular-nums">{fmtPeso(r.total_cents)}</Td>
      <Td>
        <Status value={r.status} />
      </Td>
      <Td>
        <RowActions actions={actions} />
      </Td>
    </tr>
  );

  const cols = ["Space", "When", "Party", "Value", "Status", "Actions"];

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Reservations"
        lead="Courts confirm instantly. Room requests wait here for a decision."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Awaiting approval" value={pending.length} tone="clay" />
        <Stat label="Confirmed upcoming" value={approved.length} tone="moss" />
        <Stat label="Completed this month" value={past.length} />
      </div>

      <AdminPanel title="Awaiting approval">
        {pending.length ? (
          <Table columns={cols}>
            {pending.map((r) => row(r, ["Approve", "Reject", "Message"]))}
          </Table>
        ) : (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
            Nothing waiting on a decision.
          </p>
        )}
      </AdminPanel>

      <AdminPanel title="Confirmed">
        {approved.length ? (
          <Table columns={cols}>
            {approved.map((r) => row(r, ["Move", "Cancel", "Note"]))}
          </Table>
        ) : (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
            No confirmed bookings ahead.
          </p>
        )}
      </AdminPanel>

      <AdminPanel title="Past">
        {past.length ? (
          <Table columns={cols}>
            {past.map((r) => row(r, ["View", "Incident"]))}
          </Table>
        ) : (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
            Nothing yet.
          </p>
        )}
      </AdminPanel>

      <AdminNote>
        Double-booking is prevented by the database itself, not by this screen.
        A Postgres exclusion constraint rejects any overlapping reservation on
        the same court, so two people clicking at the same moment cannot both
        succeed.
      </AdminNote>
    </div>
  );
}

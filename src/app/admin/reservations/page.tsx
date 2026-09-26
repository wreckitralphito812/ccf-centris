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
import { equipmentSummary, foodLabel, setupLabel } from "@/lib/ministry-rooms";

export const metadata: Metadata = { title: "Reservations" };

/** One request: every room it asked for, decided together. */
interface RequestGroup {
  first: AdminReservation;
  rooms: string[];
}

function groupRequests(rows: AdminReservation[]): RequestGroup[] {
  const groups = new Map<string, RequestGroup>();
  for (const r of rows) {
    const key = r.request_group ?? r.id;
    const g = groups.get(key);
    if (g) g.rooms.push(r.facility_name ?? "—");
    else groups.set(key, { first: r, rooms: [r.court_name ?? r.facility_name ?? "—"] });
  }
  return [...groups.values()];
}

export default async function AdminReservations() {
  const reservations = groupRequests(await getReservations());

  const pending = reservations.filter((g) => g.first.status === "pending");
  const approved = reservations.filter((g) => g.first.status === "approved");
  const past = reservations.filter(
    (g) => !["pending", "approved"].includes(g.first.status),
  );

  const readOnly = !isAdminConfigured() || !hasSupabase();

  const row = (
    { first: r, rooms }: RequestGroup,
    transitions: Parameters<typeof QueueActions>[0]["transitions"],
  ) => (
    <tr key={r.id}>
      <Td>
        <span className="font-semibold">{r.activity_name ?? "—"}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {rooms.join(", ")}
        </span>
        <span className="mt-1 block text-[0.78rem] leading-relaxed text-ink-mute">
          {[
            r.layout ? setupLabel(r.layout) : null,
            r.equipment && Object.keys(r.equipment).length ? equipmentSummary(r.equipment) : null,
            r.food ? foodLabel(r.food) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {r.purpose ? (
          <span className="mt-1 block max-w-xs text-[0.78rem] italic leading-relaxed text-ink-mute">
            {r.purpose}
          </span>
        ) : null}
      </Td>
      <Td>
        <span className="font-semibold">{r.contact_name}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {r.organization ? `${r.organization} · ` : ""}
          {r.contact_email}
          {r.contact_mobile ? ` · ${r.contact_mobile}` : ""}
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

  const cols = ["Event and rooms", "Requested by", "When", "People", "Status", "Actions"];

  const empty = (msg: string) => (
    <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">{msg}</p>
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Reservations"
        lead="Room requests arrive here as pending, and each one is already holding its rooms. Approving or declining emails the requester; a request for several rooms is decided as one."
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
                  { label: "Decline", status: "rejected", tone: "stop" },
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

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
import { getDgroupTableBookings, type AdminDgroupTable } from "@/lib/queries";
import { setDgroupTableStatus } from "@/app/actions/admin";
import { hasSupabase } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/admin-auth";
import { DGROUP_ROOMS, DGROUP_SLOTS, nightLabel } from "@/lib/dgroup-tables";

export const metadata: Metadata = { title: "Dgroup tables" };

const roomName = (slug: string) =>
  DGROUP_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

const slotLabel = (id: string) =>
  DGROUP_SLOTS.find((s) => s.id === id)?.label ?? id;

/**
 * The Dgroup table queue.
 *
 * A request arrives pending with its table already assigned and held, so
 * approving is just telling the leader — the table was never at risk of going
 * to someone else. Declining is what frees it, which is why clearing this
 * queue matters: an ignored request sits on a table nobody else can have.
 */
export default async function AdminDgroupTables() {
  const bookings = await getDgroupTableBookings();

  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const closed = bookings.filter(
    (b) => !["pending", "confirmed"].includes(b.status),
  );

  const readOnly = !isAdminConfigured() || !hasSupabase();

  const row = (
    b: AdminDgroupTable,
    transitions: Parameters<typeof QueueActions>[0]["transitions"],
  ) => (
    <tr key={b.id}>
      <Td>
        <span className="font-semibold">{b.leader_name}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {b.contact_mobile}
        </span>
      </Td>
      <Td>
        {nightLabel(b.booked_on)}
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {slotLabel(b.slot_id)}
        </span>
      </Td>
      <Td>
        <span className="font-semibold">Table {b.table_label}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {roomName(b.room_slug)} · seats {b.table_seats}
        </span>
      </Td>
      <Td className="tabular-nums">{b.group_size}</Td>
      <Td>
        <Status value={b.status} />
      </Td>
      <Td>
        {readOnly ? (
          <span className="label text-ink-mute">Read-only</span>
        ) : (
          <QueueActions
            id={b.id}
            current={b.status}
            transitions={transitions}
            onSet={setDgroupTableStatus}
          />
        )}
      </Td>
    </tr>
  );

  const cols = ["Dgroup leader", "When", "Table", "Group", "Status", "Actions"];

  const empty = (msg: string) => (
    <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">{msg}</p>
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Dgroup tables"
        lead="Table requests arrive pending, with a table already assigned and held for them. Approving tells the leader their table number; declining frees the table for someone else."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live requests.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Awaiting approval" value={pending.length} tone="clay" />
        <Stat label="Approved upcoming" value={confirmed.length} tone="moss" />
        <Stat label="Closed" value={closed.length} />
      </div>

      <AdminPanel title="Awaiting approval">
        {pending.length
          ? (
            <Table columns={cols}>
              {pending.map((b) =>
                row(b, [
                  { label: "Approve", status: "confirmed", tone: "go" },
                  { label: "Decline", status: "declined", tone: "stop" },
                ]),
              )}
            </Table>
          )
          : empty("Nothing waiting on a decision.")}
      </AdminPanel>

      <AdminPanel title="Approved">
        {confirmed.length
          ? (
            <Table columns={cols}>
              {confirmed.map((b) =>
                row(b, [{ label: "Cancel", status: "cancelled", tone: "stop" }]),
              )}
            </Table>
          )
          : empty("No approved tables ahead.")}
      </AdminPanel>

      <AdminPanel title="Closed">
        {closed.length
          ? (
            <Table columns={cols}>
              {closed.map((b) =>
                row(b, [{ label: "Reopen as pending", status: "pending" }]),
              )}
            </Table>
          )
          : empty("Nothing yet.")}
      </AdminPanel>

      <AdminNote>
        Two leaders can never be given the same table. A partial unique index
        holds each table for the night and slot it was assigned on, counting
        pending and approved alike, so a second request for that table is
        refused by the database and the site moves the leader to the next best
        free table instead.
      </AdminNote>
    </div>
  );
}

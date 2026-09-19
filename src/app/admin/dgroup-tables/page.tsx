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
import { nightLabel, roomName, slotLabel, tablesLabel } from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";

export const metadata: Metadata = { title: "Dgroup tables" };


/**
 * Dgroup table bookings. They confirm on their own the moment a leader accepts
 * the policies, so this is a list to keep an eye on rather than a queue to
 * clear. An admin can cancel one (a no-show, a broken policy); the leader is
 * emailed and the tables are freed.
 */
export default async function AdminDgroupTables() {
  const bookings = await getDgroupTableBookings();
  const today = manilaDateKey();

  const upcoming = bookings.filter(
    (b) => ["pending", "confirmed"].includes(b.status) && b.booked_on >= today,
  );
  const past = bookings.filter(
    (b) => ["pending", "confirmed"].includes(b.status) && b.booked_on < today,
  );
  const cancelled = bookings.filter((b) => !["pending", "confirmed"].includes(b.status));

  const readOnly = !isAdminConfigured() || !hasSupabase();

  const row = (b: AdminDgroupTable, actions: boolean) => (
    <tr key={b.id}>
      <Td>
        <span className="font-semibold">{b.leader_name}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{b.contact_mobile}</span>
        {b.leader_email ? (
          <span className="block text-[0.82rem] text-ink-mute">{b.leader_email}</span>
        ) : null}
      </Td>
      <Td>
        {nightLabel(b.booked_on)}
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{slotLabel(b.slot_id)}</span>
      </Td>
      <Td>
        <span className="font-semibold">{tablesLabel(b.table_labels)}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
          {roomName(b.room_slug)} · {b.table_seats} seats
        </span>
      </Td>
      <Td className="tabular-nums">{b.group_size}</Td>
      <Td>
        <Status value={b.status} />
      </Td>
      <Td>
        {!actions ? null : readOnly ? (
          <span className="label text-ink-mute">Read-only</span>
        ) : (
          <QueueActions
            id={b.id}
            current={b.status}
            transitions={[{ label: "Cancel", status: "cancelled", tone: "stop" }]}
            onSet={setDgroupTableStatus}
          />
        )}
      </Td>
    </tr>
  );

  const cols = ["Dgroup leader", "When", "Tables", "Group", "Status", ""];
  const empty = (msg: string) => (
    <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">{msg}</p>
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Dgroup tables"
        lead="Bookings confirm automatically once a leader accepts the policies, and the leader gets their table by email. Cancel one here and the leader is told and the tables are freed."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live bookings.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming" value={upcoming.length} tone="clay" />
        <Stat label="Past" value={past.length} tone="moss" />
        <Stat label="Cancelled" value={cancelled.length} />
      </div>

      <AdminPanel title="Upcoming">
        {upcoming.length ? (
          <Table columns={cols}>{upcoming.map((b) => row(b, true))}</Table>
        ) : (
          empty("No bookings ahead.")
        )}
      </AdminPanel>

      <AdminPanel title="Past">
        {past.length ? <Table columns={cols}>{past.map((b) => row(b, false))}</Table> : empty("Nothing yet.")}
      </AdminPanel>

      <AdminPanel title="Cancelled">
        {cancelled.length ? (
          <Table columns={cols}>{cancelled.map((b) => row(b, false))}</Table>
        ) : (
          empty("Nothing yet.")
        )}
      </AdminPanel>
    </div>
  );
}

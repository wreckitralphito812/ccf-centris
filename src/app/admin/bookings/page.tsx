import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, AdminPanel, Status, Table, Td } from "../admin-ui";
import { QueueActions } from "../queue-actions";
import { MoveForm } from "./move-form";
import { setDgroupTableStatus, setReservationStatus } from "@/app/actions/admin";
import { searchBookings, type AdminReservation } from "@/lib/queries";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";
import { manilaDateKey } from "@/lib/format";
import { manilaDay, manilaMinutesOf } from "@/lib/admin-day";
import { nightLabel, roomName, slotLabel, tablesLabel } from "@/lib/dgroup-tables";
import { timeLabel } from "@/lib/ministry-rooms";

export const metadata: Metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

/** Rooms asked for together are one request (request_group). */
function groupRooms(rows: AdminReservation[]) {
  const groups = new Map<string, { first: AdminReservation; rooms: string[] }>();
  for (const r of rows) {
    const k = r.request_group ?? r.id;
    const g = groups.get(k);
    if (g) g.rooms.push(r.facility_name ?? "—");
    else groups.set(k, { first: r, rooms: [r.facility_name ?? "—"] });
  }
  return [...groups.values()];
}

/**
 * Find any booking (2026-10-03): a Dgroup leader or a room request, by name,
 * email, mobile, event or ministry. Dgroup bookings can be moved or
 * cancelled here; room requests approved, declined or cancelled.
 */
export default async function AdminBookings({ searchParams }: PageProps<"/admin/bookings">) {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const today = manilaDateKey();
  const { tables, rooms } = await searchBookings(q);
  const requests = groupRooms(rooms);
  const searched = q.trim().length >= 2;

  return (
    <div className="space-y-8">
      <AdminHeader title="Bookings" lead="Find a Dgroup table booking or a room request by name, email, mobile, event or ministry." />
      {!hasSupabase() ? <AdminNote>Not connected to a database.</AdminNote> : null}

      <form className="flex flex-wrap gap-2" role="search">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search bookings</span>
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="e.g. Ralph, 0917, Elevate"
            className="calm-input min-h-12 w-full px-4 text-[1rem] text-ink"
          />
        </label>
        <button type="submit" className="btn-press min-h-12 rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright hover:bg-clay-deep">
          Search
        </button>
      </form>

      {!searched ? (
        <p className="text-[0.95rem] text-ink-mute">Type at least two letters or digits.</p>
      ) : (
        <>
          <AdminPanel title={`Dgroup tables · ${tables.length}`}>
            {tables.length ? (
              <Table columns={["Leader", "When", "Tables", "Group", "Status", ""]}>
                {tables.map((b) => {
                  const live = b.status === "confirmed" && b.booked_on >= today;
                  return (
                    <tr key={b.id}>
                      <Td>
                        <span className="font-semibold">{b.leader_name}</span>
                        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                          {b.contact_mobile}
                          {b.leader_email ? ` · ${b.leader_email}` : ""}
                        </span>
                      </Td>
                      <Td>
                        <Link href={`/admin/today?d=${b.booked_on}`} className="hover:text-clay">
                          {nightLabel(b.booked_on)}
                        </Link>
                        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{slotLabel(b.slot_id)}</span>
                      </Td>
                      <Td>
                        <span className="font-semibold">{tablesLabel(b.table_labels)}</span>
                        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{roomName(b.room_slug)}</span>
                      </Td>
                      <Td className="tabular-nums">{b.group_size}</Td>
                      <Td>
                        <Status value={b.status} />
                      </Td>
                      <Td>
                        {!live ? null : readOnly ? (
                          <span className="label text-ink-mute">Read-only</span>
                        ) : (
                          <span className="flex flex-col items-start gap-2">
                            <MoveForm id={b.id} date={b.booked_on} slot={b.slot_id} today={today} />
                            <QueueActions
                              id={b.id}
                              current={b.status}
                              transitions={[{ label: "Cancel", status: "cancelled", tone: "stop" }]}
                              onSet={setDgroupTableStatus}
                            />
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">No Dgroup bookings match.</p>
            )}
          </AdminPanel>

          <AdminPanel title={`Room requests · ${requests.length}`}>
            {requests.length ? (
              <Table columns={["Event and rooms", "Requested by", "When", "People", "Status", ""]}>
                {requests.map(({ first: r, rooms: names }) => {
                  const day = manilaDay(r.starts_at);
                  const transitions =
                    r.status === "pending"
                      ? [
                          { label: "Approve", status: "approved", tone: "go" as const },
                          { label: "Decline", status: "rejected", tone: "stop" as const },
                        ]
                      : r.status === "approved"
                        ? [{ label: "Cancel", status: "cancelled", tone: "stop" as const }]
                        : [];
                  return (
                    <tr key={r.id}>
                      <Td>
                        <span className="font-semibold">{r.activity_name ?? "—"}</span>
                        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{names.join(", ")}</span>
                      </Td>
                      <Td>
                        <span className="font-semibold">{r.contact_name}</span>
                        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                          {r.organization ? `${r.organization} · ` : ""}
                          {r.contact_email}
                        </span>
                      </Td>
                      <Td>
                        <Link href={`/admin/today?d=${day}`} className="hover:text-clay">
                          {nightLabel(day)}
                        </Link>
                        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                          {timeLabel(manilaMinutesOf(r.starts_at))} – {timeLabel(manilaMinutesOf(r.ends_at))}
                        </span>
                      </Td>
                      <Td className="tabular-nums">{r.participants}</Td>
                      <Td>
                        <Status value={r.status} />
                      </Td>
                      <Td>
                        {!transitions.length ? null : readOnly ? (
                          <span className="label text-ink-mute">Read-only</span>
                        ) : (
                          <QueueActions id={r.id} current={r.status} transitions={transitions} onSet={setReservationStatus} />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">No room requests match.</p>
            )}
          </AdminPanel>
        </>
      )}
    </div>
  );
}

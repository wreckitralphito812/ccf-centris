import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  QuickLink,
  Stat,
  Status,
  Table,
  Td,
} from "./admin-ui";
import {
  findDgroups,
  getMyReservations,
  getServiceWindow,
  getUpcomingEvents,
  getVolunteerRoles,
} from "@/lib/queries";
import { fmtDayLong, fmtDayShort, fmtPeso, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [window, events, dgroups, roles, reservations] = await Promise.all([
    getServiceWindow(),
    getUpcomingEvents(5),
    findDgroups({}),
    getVolunteerRoles(),
    getMyReservations(),
  ]);

  const pending = reservations.filter((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Dashboard"
        lead="What needs attention at CCF Centris today."
      />

      {/* Queues first: the things a person has to act on. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awaiting approval" value={pending.length} tone="clay" note="Room reservation requests" />
        <Stat label="Dgroup enquiries" value={7} tone="clay" note="Unassigned this week" />
        <Stat label="Prayer requests" value={12} tone="clay" note="Prayer team only" />
        <Stat label="Volunteer applications" value={5} tone="clay" note="Awaiting a first reply" />
      </div>

      {/* Then the picture. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open Dgroups" value={dgroups.length} note="Accepting new members" />
        <Stat label="Upcoming events" value={events.length} note="Published and dated" />
        <Stat label="Volunteer roles" value={roles.length} note="Across all teams" />
        <Stat
          label="Next service"
          value={window.next ? fmtTime(window.next.starts_at) : "—"}
          note={window.next ? fmtDayLong(window.next.starts_at) : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Reservations awaiting approval"
          action={
            <Link href="/admin/reservations" className="label text-clay underline underline-offset-4">
              All reservations
            </Link>
          }
        >
          {pending.length ? (
            <Table columns={["Space", "When", "Party", "Value", "Status"]}>
              {pending.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="font-semibold">{r.facility_name}</span>
                    {r.activity_name ? (
                      <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                        {r.activity_name}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    {fmtDayShort(r.starts_at)}
                    <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                      {fmtTime(r.starts_at)} – {fmtTime(r.ends_at)}
                    </span>
                  </Td>
                  <Td>{r.participants}</Td>
                  <Td>{fmtPeso(r.total_cents)}</Td>
                  <Td>
                    <Status value={r.status} />
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
              Nothing waiting. Everything is approved or completed.
            </p>
          )}
        </AdminPanel>

        <AdminPanel
          title="Next events"
          action={
            <Link href="/admin/events" className="label text-clay underline underline-offset-4">
              All events
            </Link>
          }
        >
          <Table columns={["Event", "When", "Registered", "Status"]}>
            {events.map((e) => {
              const full = e.capacity !== null && e.seats_taken >= e.capacity;
              return (
                <tr key={e.id}>
                  <Td>
                    <span className="font-semibold">{e.title}</span>
                    <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                      {e.organizer}
                    </span>
                  </Td>
                  <Td>{fmtDayShort(e.starts_at)}</Td>
                  <Td className="tabular-nums">
                    {e.capacity === null
                      ? "Open"
                      : `${e.seats_taken} / ${e.capacity}`}
                  </Td>
                  <Td>
                    <Status value={full ? "full" : "published"} />
                  </Td>
                </tr>
              );
            })}
          </Table>
        </AdminPanel>
      </div>

      <AdminPanel title="Jump to">
        <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/admin/services" title="Services" note="Schedule, speakers, and the livestream" />
          <QuickLink href="/admin/messages" title="Messages" note="Publish teaching and attach the 4Ws" />
          <QuickLink href="/admin/dgroups" title="Dgroups" note="Groups, leaders, and enquiries" />
          <QuickLink href="/admin/reservations" title="Reservations" note="Approve, reject, and resolve clashes" />
          <QuickLink href="/admin/facilities" title="Facilities" note="Rates, hours, blackouts, and courts" />
          <QuickLink href="/admin/prayer" title="Prayer requests" note="Prayer and pastoral teams only" />
          <QuickLink href="/admin/announcements" title="Announcements" note="Site-wide banners and notices" />
          <QuickLink href="/admin/users" title="Users and roles" note="Who can see and do what" />
        </div>
      </AdminPanel>

      <AdminNote>
        This is a preview of the CCF Centris admin. In the live system every
        screen is gated by role: a facilities administrator never sees a prayer
        request, and prayer and pastoral records are restricted at the database
        level rather than only in the interface.
      </AdminNote>
    </div>
  );
}

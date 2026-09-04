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
  getDgroupInquiries,
  getReservations,
  getServiceWindow,
  getUpcomingEvents,
  getVolunteerApplications,
  getVolunteerRoles,
} from "@/lib/queries";
import { fmtDayLong, fmtDayShort, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [window, events, dgroups, roles, reservations, inquiries, applications] =
    await Promise.all([
      getServiceWindow(),
      getUpcomingEvents(5),
      findDgroups({}),
      getVolunteerRoles(),
      getReservations(),
      getDgroupInquiries(),
      getVolunteerApplications(),
    ]);

  const pending = reservations.filter((r) => r.status === "pending");
  const openInquiries = inquiries.filter(
    (e) => e.status === "new" || e.status === "contacted",
  );
  const freshApplications = applications.filter((a) => a.status === "submitted");

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Dashboard"
        lead="What needs attention at CCF Centris today."
      />

      {/* Queues first: the things a person has to act on. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awaiting approval" value={pending.length} tone="clay" note="Reservation requests" />
        <Stat label="Dgroup enquiries" value={openInquiries.length} tone="clay" note="New or in conversation" />
        <Stat label="Volunteer applications" value={freshApplications.length} tone="clay" note="Awaiting a first reply" />
        <Stat
          label="Next service"
          value={window.next ? fmtTime(window.next.starts_at) : "—"}
          note={window.next ? fmtDayLong(window.next.starts_at) : undefined}
        />
      </div>

      {/* Then the picture. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open Dgroups" value={dgroups.length} note="Accepting new members" />
        <Stat label="Upcoming events" value={events.length} note="Published and dated" />
        <Stat label="Volunteer roles" value={roles.length} note="Across all teams" />
        <Stat label="Reservations total" value={reservations.length} note="All statuses, all time" />
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
            <Table columns={["Space", "Requested by", "When", "Party", "Status"]}>
              {pending.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="font-semibold">{r.facility_name ?? "—"}</span>
                    {r.court_name ?? r.activity_name ? (
                      <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                        {r.court_name ?? r.activity_name}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <span className="font-semibold">{r.contact_name}</span>
                    <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                      {r.contact_email}
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
        Reservations, Dgroup enquiries, and volunteer applications are live.
        Access is currently one shared staff code; per-role gating — so a
        facilities administrator never sees a prayer request — lands with staff
        accounts.
      </AdminNote>
    </div>
  );
}

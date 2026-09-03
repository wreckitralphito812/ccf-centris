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
import { getUpcomingEvents } from "@/lib/queries";
import { fmtDayShort, fmtPeso, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEvents() {
  const events = await getUpcomingEvents();
  const full = events.filter(
    (e) => e.capacity !== null && e.seats_taken >= e.capacity,
  );
  const registered = events.reduce((n, e) => n + e.seats_taken, 0);

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Events"
        lead="Everything published, with registration numbers and capacity."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Upcoming" value={events.length} />
        <Stat label="Total registrations" value={registered} tone="moss" />
        <Stat label="At capacity" value={full.length} tone="clay" note="Waitlists running" />
        <Stat
          label="Categories"
          value={new Set(events.map((e) => e.category)).size}
        />
      </div>

      <AdminPanel title="Upcoming events">
        <Table
          columns={["Event", "When", "Organiser", "Registered", "Price", "Status", "Actions"]}
        >
          {events.map((e) => {
            const isFull = e.capacity !== null && e.seats_taken >= e.capacity;
            return (
              <tr key={e.id}>
                <Td>
                  <span className="font-semibold">{e.title}</span>
                  <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                    {e.category} · {e.location_note}
                  </span>
                </Td>
                <Td>
                  {fmtDayShort(e.starts_at)}
                  <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                    {fmtTime(e.starts_at)}
                  </span>
                </Td>
                <Td>{e.organizer}</Td>
                <Td className="tabular-nums">
                  {e.capacity === null
                    ? "Open"
                    : `${e.seats_taken} / ${e.capacity}`}
                </Td>
                <Td className="tabular-nums">{fmtPeso(e.price_cents)}</Td>
                <Td>
                  <Status value={isFull ? "full" : "published"} />
                </Td>
                <Td>
                  <RowActions actions={["Edit", "Attendees", "Check-in"]} />
                </Td>
              </tr>
            );
          })}
        </Table>
      </AdminPanel>

      <AdminNote>
        When an event reaches capacity, registration switches to a waitlist
        automatically. Waitlisted people are emailed in order when a place
        opens, and nothing is confirmed until they accept it.
      </AdminNote>
    </div>
  );
}

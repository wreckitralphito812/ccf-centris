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
import { getServiceWindow, getUpcomingServices } from "@/lib/queries";
import { fmtDayShort, fmtTime } from "@/lib/format";
import { YOUTUBE } from "@/lib/site";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServices() {
  const [services, window] = await Promise.all([
    getUpcomingServices(12),
    getServiceWindow(),
  ]);

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Services"
        lead="Recurring worship schedule, speakers, and the livestream for each service."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Next service"
          value={window.next ? fmtTime(window.next.starts_at) : "—"}
          note={window.next ? fmtDayShort(window.next.starts_at) : undefined}
          tone="clay"
        />
        <Stat label="Scheduled ahead" value={services.length} note="Next four weeks" />
        <Stat label="Live status" value={window.current ? "On air" : "Off air"} tone={window.current ? "clay" : "ink"} />
      </div>

      <AdminPanel title="Upcoming schedule">
        <Table columns={["When", "Service", "Venue", "Speaker", "Series", "Status", "Actions"]}>
          {services.map((s) => (
            <tr key={s.id}>
              <Td>
                {fmtDayShort(s.starts_at)}
                <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                  {fmtTime(s.starts_at)}
                </span>
              </Td>
              <Td className="font-semibold">{s.title}</Td>
              <Td>{s.venue?.name}</Td>
              <Td>{s.speaker?.name ?? "—"}</Td>
              <Td>{s.series?.title ?? "—"}</Td>
              <Td>
                <Status value={s.status} />
              </Td>
              <Td>
                <RowActions actions={["Edit", "Stream", "Cancel"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Livestream">
        <div className="grid gap-px bg-hairline sm:grid-cols-2">
          <div className="bg-paper-bright p-5">
            <p className="label text-ink-mute">Provider</p>
            <p className="font-display mt-2 text-xl">YouTube</p>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-mute">
              The architecture is provider independent. A service can point at
              any provider and key.
            </p>
          </div>
          <div className="bg-paper-bright p-5">
            <p className="label text-ink-mute">Channel</p>
            <p className="font-display mt-2 text-xl">{YOUTUBE.handle}</p>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-mute">
              Live status is read from the YouTube Data API and cached for 60
              seconds, so a service appears live within a minute of starting.
            </p>
          </div>
        </div>
      </AdminPanel>

      <AdminNote>
        Services are generated from a recurring schedule, so staff set the
        pattern once rather than creating each Sunday by hand. The site derives
        the previous, current, and next service automatically from that
        schedule.
      </AdminNote>
    </div>
  );
}

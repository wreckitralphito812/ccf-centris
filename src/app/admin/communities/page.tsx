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
import {
  getCommunities,
  getDgroupsForCommunity,
  getEventsForCommunity,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Communities",
  description: "CCF communities operating at this center.",
};

export default async function Page() {
  const communities = await getCommunities();
  const rows = await Promise.all(
    communities.map(async (c) => ({
      c,
      dgroups: (await getDgroupsForCommunity(c.slug)).length,
      events: (await getEventsForCommunity(c.slug)).length,
    })),
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Communities"
        lead="Which CCF communities operate at Centris, and what each one is running."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active at Centris" value={communities.length} />
        <Stat label="Dgroups across all" value={rows.reduce((n, r) => n + r.dgroups, 0)} />
        <Stat label="Upcoming events" value={rows.reduce((n, r) => n + r.events, 0)} />
      </div>

      <AdminPanel title="Communities">
        <Table columns={["Community", "Life stage", "Meets", "Dgroups", "Events", "Actions"]}>
          {rows.map(({ c, dgroups, events }) => (
            <tr key={c.id}>
              <Td>
                <span className="font-semibold">{c.name}</span>
                <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                  {c.tagline}
                </span>
              </Td>
              <Td>{c.life_stage}</Td>
              <Td className="text-ink-soft">{c.meeting_note}</Td>
              <Td className="tabular-nums">{dgroups}</Td>
              <Td className="tabular-nums">{events}</Td>
              <Td>
                <RowActions actions={["Edit", "Disable"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        Communities are enabled per satellite, so a ministry that does not run
        at Centris simply does not appear on the public site.
      </AdminNote>
    </div>
  );
}

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
import { getFacility, getSportsToday } from "@/lib/queries";
import { manilaDateKey, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sports",
  description: "Court usage and sports programmes.",
};

export default async function Page() {
  const today = manilaDateKey();
  const [hall, courts] = await Promise.all([
    getFacility("sports-hall"),
    getSportsToday(today),
  ]);
  const freeNow = courts.filter((c) =>
    c.slots.some((s) => s.state === "available"),
  ).length;

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Sports"
        lead="The Sports Hall today, and the programmes running in it."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Courts" value={hall?.courts.length ?? 0} />
        <Stat label="With free slots today" value={freeNow} tone="moss" />
        <Stat
          label="Booked hours today"
          value={courts.reduce(
            (n, c) =>
              n +
              c.slots.filter((s) => s.state === "reserved" || s.state === "pending")
                .length,
            0,
          )}
        />
        <Stat label="Programmes running" value={4} />
      </div>

      <AdminPanel title="Courts today">
        <Table columns={["Court", "Sport", "Next free", "Booked hours", "Actions"]}>
          {courts.map(({ court, slots, nextFree }) => (
            <tr key={court.id}>
              <Td className="font-semibold">{court.name}</Td>
              <Td className="capitalize">{court.sport}</Td>
              <Td>{nextFree ? fmtTime(nextFree.start) : "Fully booked"}</Td>
              <Td className="tabular-nums">
                {slots.filter((s) => s.state === "reserved" || s.state === "pending").length}
              </Td>
              <Td>
                <RowActions actions={["Block", "Maintenance"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        The Sports Hall is open to the community, so most people booking it are
        not CCF members. It is an outreach surface, not a members-only amenity.
      </AdminNote>
    </div>
  );
}

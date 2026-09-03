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
import { getGlcClasses, getGlcPrograms } from "@/lib/queries";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "GLC",
  description: "Growing Life Classes, registrations, and capacity.",
};

export default async function Page() {
  const [programs, classes] = await Promise.all([
    getGlcPrograms(),
    getGlcClasses(),
  ]);
  const seats = classes.reduce((n, c) => n + c.seats_taken, 0);

  return (
    <div className="space-y-8">
      <AdminHeader
        title="GLC"
        lead="Growing Life Classes running this term at Centris."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Programs" value={programs.length} />
        <Stat label="Classes this term" value={classes.length} />
        <Stat label="Registrations" value={seats} tone="moss" />
      </div>

      <AdminPanel title="Classes">
        <Table columns={["Class", "Schedule", "Starts", "Room", "Registered", "Status", "Actions"]}>
          {classes.map((c) => {
            const full = c.capacity !== null && c.seats_taken >= c.capacity;
            return (
              <tr key={c.id}>
                <Td className="font-semibold">
                  {c.program.code} — {c.program.title}
                </Td>
                <Td className="text-ink-soft">{c.schedule_note}</Td>
                <Td>{fmtDate(c.starts_on)}</Td>
                <Td>{c.venue_name ?? "—"}</Td>
                <Td className="tabular-nums">
                  {c.capacity === null ? "Open" : `${c.seats_taken} / ${c.capacity}`}
                </Td>
                <Td>
                  <Status value={full ? "full" : c.is_open ? "open" : "closed"} />
                </Td>
                <Td>
                  <RowActions actions={["Edit", "Roster", "Close"]} />
                </Td>
              </tr>
            );
          })}
        </Table>
      </AdminPanel>

      <AdminNote>
        GLC content is shared across CCF rather than owned by one satellite, so
        programs are centrally maintained while classes are scheduled locally.
      </AdminNote>
    </div>
  );
}

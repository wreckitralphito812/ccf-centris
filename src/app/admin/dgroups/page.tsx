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
import { findDgroups } from "@/lib/queries";
import { AUDIENCE_LABEL, MODE_LABEL, dayName } from "@/lib/format";

export const metadata: Metadata = { title: "Dgroups" };

/** Enquiries waiting on the Dgroup team. */
const ENQUIRIES = [
  { id: "e1", name: "Rina D.", group: "Quezon Ave Young Pros", when: "1 hour ago", status: "new" },
  { id: "e2", name: "Marco S.", group: "Centris Men's Breakfast", when: "Yesterday", status: "new" },
  { id: "e3", name: "Anonymous", group: "New Believers", when: "Yesterday", status: "new" },
  { id: "e4", name: "Cess V.", group: "Tuesday Morning Women", when: "2 days ago", status: "contacted" },
  { id: "e5", name: "Paolo T.", group: "Married and Learning", when: "3 days ago", status: "contacted" },
  { id: "e6", name: "Jun L.", group: "Sports Ministry Dgroup", when: "4 days ago", status: "joined" },
  { id: "e7", name: "Beth A.", group: "Online Weeknight", when: "5 days ago", status: "joined" },
];

export default async function AdminDgroups() {
  const dgroups = await findDgroups({});
  const newEnquiries = ENQUIRIES.filter((e) => e.status === "new");
  const nearlyFull = dgroups.filter(
    (d) => d.seats_left !== null && d.seats_left <= 2,
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Dgroups"
        lead="Groups, leaders, and the enquiries waiting for an introduction."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="New enquiries" value={newEnquiries.length} tone="clay" note="Unassigned" />
        <Stat label="Open groups" value={dgroups.length} note="Accepting members" />
        <Stat label="Nearly full" value={nearlyFull.length} note="Two places or fewer" />
        <Stat label="Multiplied this year" value={4} tone="moss" note="New groups from existing ones" />
      </div>

      <AdminPanel title="Enquiries">
        <Table columns={["Who", "Interested in", "Received", "Status", "Actions"]}>
          {ENQUIRIES.map((e) => (
            <tr key={e.id}>
              <Td className="font-semibold">{e.name}</Td>
              <Td>{e.group}</Td>
              <Td className="text-ink-mute">{e.when}</Td>
              <Td>
                <Status value={e.status} />
              </Td>
              <Td>
                <RowActions
                  actions={
                    e.status === "new"
                      ? ["Assign", "Introduce", "Decline"]
                      : ["View", "Mark joined"]
                  }
                />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Groups">
        <Table columns={["Group", "Meets", "Audience", "Format", "Places", "Actions"]}>
          {dgroups.map((d) => (
            <tr key={d.id}>
              <Td>
                <span className="font-semibold">{d.name}</span>
                <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                  {d.leader_first_name ? `Led by ${d.leader_first_name}` : "No leader set"}
                </span>
              </Td>
              <Td>
                {dayName(d.day_of_week)}
                <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                  {d.general_area}
                </span>
              </Td>
              <Td>{AUDIENCE_LABEL[d.audience]}</Td>
              <Td>{MODE_LABEL[d.mode]}</Td>
              <Td className="tabular-nums">
                {d.seats_left === null ? "Open" : d.seats_left}
              </Td>
              <Td>
                <RowActions actions={["Edit", "Leader", "Close"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        Enquiries never go straight to a leader. They arrive here first so the
        Dgroup team can make an introduction, which is also why leader contact
        details and exact addresses are never shown publicly.
      </AdminNote>
    </div>
  );
}

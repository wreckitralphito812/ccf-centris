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
import { getVolunteerRoles } from "@/lib/queries";

const APPLICATIONS = [
  { name: "Trina B.", role: "NXTGEN Teacher", when: "2 hours ago", status: "new", screened: false },
  { name: "Rey N.", role: "Production", when: "Yesterday", status: "new", screened: true },
  { name: "Kaye O.", role: "Welcome Team", when: "2 days ago", status: "reviewing", screened: true },
  { name: "Gab M.", role: "Sports Ministry Volunteer", when: "3 days ago", status: "accepted", screened: true },
  { name: "Ali R.", role: "Elevate Small Group Leader", when: "5 days ago", status: "reviewing", screened: false },
];

export const metadata: Metadata = {
  title: "Volunteers",
  description: "Roles, applications, and screening status.",
};

export default async function Page() {
  const roles = await getVolunteerRoles();
  const awaiting = APPLICATIONS.filter((a) => !a.screened).length;

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Volunteers"
        lead="Open roles, applications, and who still needs screening."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="New applications" value={2} tone="clay" />
        <Stat label="Awaiting screening" value={awaiting} tone="clay" note="Cannot serve until cleared" />
        <Stat label="Open roles" value={roles.length} />
        <Stat label="Active volunteers" value={147} tone="moss" />
      </div>

      <AdminPanel title="Applications">
        <Table columns={["Applicant", "Role", "Received", "Screening", "Status", "Actions"]}>
          {APPLICATIONS.map((a) => (
            <tr key={a.name}>
              <Td className="font-semibold">{a.name}</Td>
              <Td>{a.role}</Td>
              <Td className="text-ink-mute">{a.when}</Td>
              <Td>
                <Status value={a.screened ? "approved" : "pending"} />
              </Td>
              <Td>
                <Status value={a.status} />
              </Td>
              <Td>
                <RowActions actions={["Reply", "Screen", "Assign"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Roles">
        <Table columns={["Role", "Team", "Commitment", "Status", "Actions"]}>
          {roles.map((r) => (
            <tr key={r.id}>
              <Td className="font-semibold">{r.title}</Td>
              <Td>{r.ministry}</Td>
              <Td className="text-ink-soft">{r.commitment}</Td>
              <Td>
                <Status value={r.is_open ? "open" : "closed"} />
              </Td>
              <Td>
                <RowActions actions={["Edit", "Close"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        NXTGEN, Elevate, and prayer roles cannot be assigned until a background
        check and training are recorded. That gate is enforced, not advisory.
      </AdminNote>
    </div>
  );
}

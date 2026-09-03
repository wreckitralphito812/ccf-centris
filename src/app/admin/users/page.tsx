import type { Metadata } from "next";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  RowActions,
  Stat,
  Table,
  Td,
} from "../admin-ui";

export const metadata: Metadata = { title: "Users and roles" };

/**
 * Roles are per-satellite, so a ministry leader at Centris is not one at CCF
 * Main. What each role can reach is enforced by row-level security, and this
 * table is the human-readable version of those policies.
 */
const ROLES = [
  { role: "Super admin", people: 2, reach: "Everything, across every satellite", care: true },
  { role: "Satellite administrator", people: 3, reach: "All of CCF Centris except care records", care: false },
  { role: "Communications", people: 4, reach: "Messages, series, announcements, and the livestream", care: false },
  { role: "Service administrator", people: 2, reach: "Service schedule and speakers", care: false },
  { role: "Ministry leader", people: 11, reach: "Their own community and its volunteers", care: false },
  { role: "Dgroup administrator", people: 3, reach: "Dgroups, leaders, and enquiries", care: false },
  { role: "Events administrator", people: 4, reach: "Events, registrations, and check-in", care: false },
  { role: "Facilities administrator", people: 5, reach: "Spaces, courts, rates, and reservations", care: false },
  { role: "Sports administrator", people: 3, reach: "Sports Hall bookings and programmes", care: false },
  { role: "Volunteer administrator", people: 2, reach: "Applications, assignments, and screening", care: false },
  { role: "Pastoral care", people: 4, reach: "Pastoral and prayer requests only", care: true },
  { role: "Prayer team", people: 9, reach: "Prayer requests only", care: true },
];

export default function AdminUsers() {
  const total = ROLES.reduce((n, r) => n + r.people, 0);
  const careRoles = ROLES.filter((r) => r.care);

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Users and roles"
        lead="Who can see and do what. Roles are granted per satellite, not globally."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="People with a role" value={total} />
        <Stat label="Distinct roles" value={ROLES.length} />
        <Stat label="Can read care records" value={careRoles.reduce((n, r) => n + r.people, 0)} tone="clay" />
        <Stat label="Satellites" value={2} note="Centris and CCF Main" />
      </div>

      <AdminPanel title="Roles">
        <Table columns={["Role", "People", "What they can reach", "Actions"]}>
          {ROLES.map((r) => (
            <tr key={r.role}>
              <Td>
                <span className="font-semibold">{r.role}</span>
                {r.care ? (
                  <span className="label mt-1 inline-flex border border-clay/40 bg-clay/10 px-2 py-0.5 text-clay-deep">
                    Care access
                  </span>
                ) : null}
              </Td>
              <Td className="tabular-nums">{r.people}</Td>
              <Td className="text-ink-soft">{r.reach}</Td>
              <Td>
                <RowActions actions={["Members", "Permissions"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        Care records are the tightest boundary in the system. Prayer and
        pastoral requests are readable only by the prayer team, pastoral care,
        and super administrators. A satellite administrator has broad access to
        everything else and still cannot read them, which is deliberate.
      </AdminNote>
    </div>
  );
}

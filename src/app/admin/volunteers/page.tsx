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
import { QueueActions } from "../queue-actions";
import { getVolunteerApplications, getVolunteerRoles } from "@/lib/queries";
import { setApplicationStatus } from "@/app/actions/admin";
import { hasSupabase } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/admin-auth";
import { fmtDayShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Volunteers",
  description: "Roles, applications, and screening status.",
};

const TRANSITIONS = [
  { label: "Start review", status: "reviewing" as const },
  { label: "Accept", status: "accepted" as const, tone: "go" as const },
  { label: "Decline", status: "declined" as const, tone: "stop" as const },
];

export default async function Page() {
  const [roles, applications] = await Promise.all([
    getVolunteerRoles(),
    getVolunteerApplications(),
  ]);
  const fresh = applications.filter((a) => a.status === "submitted").length;
  const readOnly = !isAdminConfigured() || !hasSupabase();

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Volunteers"
        lead="Open roles, applications, and who still needs screening."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live applications.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="New applications" value={fresh} tone="clay" />
        <Stat label="Total applications" value={applications.length} note="All time" />
        <Stat label="Open roles" value={roles.length} />
        <Stat label="In review" value={applications.filter((a) => a.status === "reviewing").length} />
      </div>

      <AdminPanel title="Applications">
        {applications.length ? (
          <Table columns={["Applicant", "Role", "Received", "Status", "Actions"]}>
            {applications.map((a) => (
              <tr key={a.id}>
                <Td>
                  <span className="font-semibold">{a.full_name}</span>
                  <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                    {a.email}
                    {a.mobile ? ` · ${a.mobile}` : ""}
                  </span>
                  {a.message ? (
                    <span className="mt-1 block max-w-md whitespace-pre-line text-[0.82rem] leading-relaxed text-ink-soft">
                      {a.message}
                    </span>
                  ) : null}
                </Td>
                <Td>{a.subject ?? "—"}</Td>
                <Td className="text-ink-mute">{fmtDayShort(a.created_at)}</Td>
                <Td>
                  <Status value={a.status} />
                </Td>
                <Td>
                  {readOnly ? (
                    <span className="label text-ink-mute">Read-only</span>
                  ) : (
                    <QueueActions
                      id={a.id}
                      current={a.status}
                      transitions={TRANSITIONS}
                      onSet={setApplicationStatus}
                    />
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
            No applications yet.
          </p>
        )}
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

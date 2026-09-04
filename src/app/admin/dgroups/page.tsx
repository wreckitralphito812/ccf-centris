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
import { findDgroups, getDgroupInquiries } from "@/lib/queries";
import { setInquiryStatus } from "@/app/actions/admin";
import { hasSupabase } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/admin-auth";
import { AUDIENCE_LABEL, MODE_LABEL, dayName, fmtDayShort } from "@/lib/format";

export const metadata: Metadata = { title: "Dgroups" };

const TRANSITIONS = [
  { label: "Mark contacted", status: "contacted" as const },
  { label: "Joined", status: "joined" as const, tone: "go" as const },
  { label: "Decline", status: "declined" as const, tone: "stop" as const },
  { label: "Close", status: "closed" as const },
];

export default async function AdminDgroups() {
  const [dgroups, inquiries] = await Promise.all([
    findDgroups({}),
    getDgroupInquiries(),
  ]);

  const open = inquiries.filter((e) => e.status === "new" || e.status === "contacted");
  const nearlyFull = dgroups.filter(
    (d) => d.seats_left !== null && d.seats_left <= 2,
  );
  const readOnly = !isAdminConfigured() || !hasSupabase();

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Dgroups"
        lead="Groups, leaders, and the enquiries waiting for an introduction."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live enquiries.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Open enquiries" value={open.length} tone="clay" note="New or in conversation" />
        <Stat label="Open groups" value={dgroups.length} note="Accepting members" />
        <Stat label="Nearly full" value={nearlyFull.length} note="Two places or fewer" />
        <Stat label="Total enquiries" value={inquiries.length} note="All time" />
      </div>

      <AdminPanel title="Enquiries">
        {inquiries.length ? (
          <Table columns={["Who", "Interested in", "Received", "Status", "Actions"]}>
            {inquiries.map((e) => (
              <tr key={e.id}>
                <Td>
                  <span className="font-semibold">{e.full_name}</span>
                  <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                    {e.email}
                    {e.mobile ? ` · ${e.mobile}` : ""}
                    {e.age_bracket ? ` · ${e.age_bracket}` : ""}
                  </span>
                  {e.message ? (
                    <span className="mt-1 block max-w-md text-[0.82rem] leading-relaxed text-ink-soft">
                      {e.message}
                    </span>
                  ) : null}
                </Td>
                <Td>{e.subject ?? "No group named"}</Td>
                <Td className="text-ink-mute">{fmtDayShort(e.created_at)}</Td>
                <Td>
                  <Status value={e.status} />
                </Td>
                <Td>
                  {readOnly ? (
                    <span className="label text-ink-mute">Read-only</span>
                  ) : (
                    <QueueActions
                      id={e.id}
                      current={e.status}
                      transitions={TRANSITIONS}
                      onSet={setInquiryStatus}
                    />
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
            No enquiries yet.
          </p>
        )}
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

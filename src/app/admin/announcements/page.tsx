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
import { getActiveAnnouncement } from "@/lib/queries";
import { fmtDayShort } from "@/lib/format";

const HISTORY = [
  { title: "Service update", body: "Severe weather, tonight's gathering moved online.", level: "urgent", when: "12 Aug" },
  { title: "Parking change", body: "Basement parking closed for maintenance this Sunday.", level: "notice", when: "5 Aug" },
  { title: "Centris is open", body: "CCF Centris opened in August 2026.", level: "info", when: "2 Aug" },
];

export const metadata: Metadata = {
  title: "Announcements",
  description: "Site-wide banners and notices.",
};

export default async function Page() {
  const active = await getActiveAnnouncement();

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Announcements"
        lead="Site-wide banners for service changes, closures, and notices."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Live now" value={active ? 1 : 0} tone={active ? "clay" : "ink"} />
        <Stat label="Scheduled" value={0} />
        <Stat label="Sent this year" value={HISTORY.length} />
      </div>

      {active ? (
        <AdminPanel title="Currently showing">
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Status value={active.level} />
              <span className="font-semibold">{active.title}</span>
              <span className="label ml-auto text-ink-mute">
                Until {active.ends_at ? fmtDayShort(active.ends_at) : "removed"}
              </span>
            </div>
            <p className="mt-2 leading-relaxed text-ink-soft">{active.body}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Edit", "End now"].map((a) => (
                <span key={a} className="label border border-ink/20 px-2.5 py-1.5 text-ink-mute">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel title="History">
        <Table columns={["Title", "Message", "Level", "Sent", "Actions"]}>
          {HISTORY.map((h) => (
            <tr key={h.title + h.when}>
              <Td className="font-semibold">{h.title}</Td>
              <Td className="text-ink-soft">{h.body}</Td>
              <Td>
                <Status value={h.level} />
              </Td>
              <Td className="text-ink-mute">{h.when}</Td>
              <Td>
                <RowActions actions={["Reuse"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        Urgent announcements appear as a banner on every page. Use that level
        sparingly, or people stop reading it.
      </AdminNote>
    </div>
  );
}

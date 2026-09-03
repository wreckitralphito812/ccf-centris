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
import { getFourWs, getMessages } from "@/lib/queries";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "4Ws",
  description: "Weekly discussion guides attached to each Sunday message.",
};

export default async function Page() {
  const [guides, messages] = await Promise.all([getFourWs(), getMessages()]);
  const byId = new Map(messages.map((m) => [m.id, m]));

  return (
    <div className="space-y-8">
      <AdminHeader
        title="4Ws"
        lead="Weekly discussion guides, each attached to a Sunday message."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Published" value={guides.length} />
        <Stat label="With PDF" value={0} tone="clay" note="Upload to enable downloads" />
        <Stat label="Downloads this month" value="642" tone="moss" />
      </div>

      <AdminPanel title="All 4Ws">
        <Table columns={["Week of", "Message", "Speaker", "PDF", "Actions"]}>
          {guides.map((w) => {
            const m = w.message_id ? byId.get(w.message_id) : null;
            return (
              <tr key={w.id}>
                <Td className="font-semibold">{fmtDate(w.week_of)}</Td>
                <Td>{m?.title ?? w.title}</Td>
                <Td>{m?.speaker?.name ?? "—"}</Td>
                <Td>
                  <Status value={w.pdf_url ? "published" : "draft"} />
                </Td>
                <Td>
                  <RowActions actions={["Edit", "Upload PDF", "Unpublish"]} />
                </Td>
              </tr>
            );
          })}
        </Table>
      </AdminPanel>

      <AdminNote>
        Uploading the weekly 4Ws attaches it to that Sunday&rsquo;s message
        automatically, so Dgroup leaders find it in the same place every week.
      </AdminNote>
    </div>
  );
}

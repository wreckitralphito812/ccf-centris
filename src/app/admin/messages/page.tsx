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
import { getMessages } from "@/lib/queries";
import { fmtDate, fmtDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessages() {
  const messages = await getMessages();
  const withFourWs = messages.filter((m) => m.four_ws).length;
  const withTranscript = messages.filter((m) => m.transcript).length;

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Messages"
        lead="Published teaching, its media, and the 4Ws attached to each one."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Published" value={messages.length} />
        <Stat label="With 4Ws" value={withFourWs} tone="moss" />
        <Stat
          label="Missing transcript"
          value={messages.length - withTranscript}
          tone="clay"
          note="Blocks in-message search"
        />
        <Stat label="Series" value={new Set(messages.map((m) => m.series?.slug)).size} />
      </div>

      <AdminPanel title="All messages">
        <Table
          columns={["Message", "Speaker", "Preached", "Length", "4Ws", "Actions"]}
        >
          {messages.map((m) => (
            <tr key={m.id}>
              <Td>
                <span className="font-semibold">{m.title}</span>
                <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                  {m.series?.title} · {m.scripture}
                </span>
              </Td>
              <Td>{m.speaker?.name ?? "—"}</Td>
              <Td>{fmtDate(m.preached_on)}</Td>
              <Td className="tabular-nums">{fmtDuration(m.duration_seconds)}</Td>
              <Td>
                <Status value={m.four_ws ? "published" : "draft"} />
              </Td>
              <Td>
                <RowActions actions={["Edit", "Media", "4Ws"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        Uploading a transcript makes a message searchable by its content, so
        someone looking for &ldquo;anxiety&rdquo; finds the exact message and
        the moment it was discussed rather than only matching titles.
      </AdminNote>
    </div>
  );
}

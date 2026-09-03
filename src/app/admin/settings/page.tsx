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
import { SITE, YOUTUBE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Settings",
  description: "Center details, integrations, and satellites.",
};

export default function Page() {
  return (
    <div className="space-y-8">
      <AdminHeader
        title="Settings"
        lead="Center details, connected services, and satellites."
      />

      <AdminPanel title="This satellite">
        <Table columns={["Setting", "Value"]}>
          {[
            ["Name", SITE.name],
            ["Parent organisation", SITE.parent],
            ["Address", SITE.addressLines.join(", ")],
            ["Timezone", SITE.timezone],
            ["Opened", "August 2026"],
          ].map(([k, v]) => (
            <tr key={k}>
              <Td className="label text-ink-mute">{k}</Td>
              <Td className="font-semibold">{v}</Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Integrations">
        <Table columns={["Service", "Status", "Detail"]}>
          {[
            ["YouTube Data API", "approved", `Channel ${YOUTUBE.handle}, live status cached 60s`],
            ["Email delivery", "pending", "Not connected. Confirmations show on screen only."],
            ["Payments", "pending", "Awaiting CCF's approved merchant account. Nothing is charged online."],
            ["SMS notifications", "pending", "Architected for, not enabled."],
          ].map(([s, st, d]) => (
            <tr key={s}>
              <Td className="font-semibold">{s}</Td>
              <Td>
                <Status value={st} />
              </Td>
              <Td className="text-ink-soft">{d}</Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Multi-satellite">
        <Table columns={["Satellite", "Status", "Shared with Centris"]}>
          {[
            ["CCF Centris", "open", "This center"],
            ["CCF Main, Ortigas East", "open", "Series, GLC programs, speakers"],
          ].map(([n, st, sh]) => (
            <tr key={n}>
              <Td className="font-semibold">{n}</Td>
              <Td>
                <Status value={st} />
              </Td>
              <Td className="text-ink-soft">{sh}</Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminNote>
        Every scoped record carries a satellite id, so adding another CCF center
        is a data change rather than a rebuild. Series, GLC programs, and
        speakers stay shared across the movement.
      </AdminNote>
    </div>
  );
}

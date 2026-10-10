import type { Metadata } from "next";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  Status,
  Table,
  Td,
} from "../admin-ui";
import { SITE } from "@/lib/site";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";
import { hasFirebase } from "@/lib/firebase/admin";
import { youtubeHealth } from "@/lib/youtube-api";

/** Checks the services live on every visit. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Center details, integrations, and satellites.",
};

export default async function Page() {
  await requireAdmin();
  const yt = await youtubeHealth();
  const from = process.env.EMAIL_FROM;

  // Real checks (2026-10-10). This table used to be fixed text: it called
  // YouTube "approved" while the live archive was on its saved list, and
  // email "not connected" while Resend was sending.
  const integrations: [string, string, string][] = [
    ["YouTube Data API", yt.ok ? "approved" : "pending", yt.detail],
    [
      "Email delivery",
      process.env.RESEND_API_KEY ? "approved" : "pending",
      process.env.RESEND_API_KEY
        ? `Resend, sending as ${from ?? "the Resend test address (set EMAIL_FROM)"}.`
        : "RESEND_API_KEY isn't set. Confirmations show on screen only.",
    ],
    [
      "Member sign-in",
      hasFirebase() ? "approved" : "pending",
      hasFirebase() ? "Firebase Auth is connected." : "Firebase isn't configured for this deployment, so sign-in is off.",
    ],
    [
      "Database",
      hasSupabase() ? "approved" : "pending",
      hasSupabase() ? "Supabase is connected." : "Supabase isn't configured; pages show sample data.",
    ],
    ["Payments", "pending", "Awaiting CCF's approved merchant account. Nothing is charged online."],
  ];

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
          {integrations.map(([s, st, d]) => (
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

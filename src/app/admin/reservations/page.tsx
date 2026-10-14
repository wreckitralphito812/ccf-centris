import type { Metadata } from "next";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  Stat,
  Status,
} from "../admin-ui";
import { QueueActions } from "../queue-actions";
import { getReservations, type AdminReservation } from "@/lib/queries";
import { setReservationStatus } from "@/app/actions/admin";
import { hasSupabase } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/admin-auth";
import { fmtDayShort, fmtTime } from "@/lib/format";
import { roomLabel } from "@/lib/admin-day";
import { equipmentSummary, foodLabel, setupLabel, tablesSummary } from "@/lib/ministry-rooms";

export const metadata: Metadata = { title: "Room requests" };
export const dynamic = "force-dynamic";

/** One request: every room it asked for, decided together. */
interface RequestGroup {
  first: AdminReservation;
  rooms: string[];
}

function groupRequests(rows: AdminReservation[]): RequestGroup[] {
  const groups = new Map<string, RequestGroup>();
  for (const r of rows) {
    const key = r.request_group ?? r.id;
    const g = groups.get(key);
    if (g) g.rooms.push(roomLabel(r));
    else groups.set(key, { first: r, rooms: [r.court_name ?? roomLabel(r)] });
  }
  return [...groups.values()];
}

export default async function AdminReservations() {
  const reservations = groupRequests(await getReservations());

  // Approved requests move to "Past" once they've ended (2026-10-14); they
  // used to stay under "Confirmed" for good.
  const now = new Date().toISOString();
  const pending = reservations.filter((g) => g.first.status === "pending");
  const approved = reservations.filter((g) => g.first.status === "approved" && g.first.ends_at >= now);
  const past = reservations
    .filter((g) => !pending.includes(g) && !approved.includes(g))
    .sort((a, b) => b.first.starts_at.localeCompare(a.first.starts_at));

  const readOnly = !isAdminConfigured() || !hasSupabase();

  const row = (
    { first: r, rooms }: RequestGroup,
    transitions: Parameters<typeof QueueActions>[0]["transitions"],
  ) => (
    <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-[1.05rem] font-semibold text-ink">{r.activity_name ?? "Room request"}</span>
          <Status value={r.status === "approved" && r.ends_at < now ? "completed" : r.status} />
        </p>
        <p className="text-[0.98rem] text-ink">
          <span className="font-semibold">{fmtDayShort(r.starts_at)}</span>, {fmtTime(r.starts_at)} – {fmtTime(r.ends_at)} ·{" "}
          {rooms.join(", ")} · {r.participants} people
        </p>
        <p className="text-[0.9rem] text-ink-soft">
          Asked by <span className="font-semibold text-ink">{r.contact_name}</span>
          {r.organization ? ` (${r.organization})` : ""}
          {r.contact_mobile ? ` · ${r.contact_mobile}` : ""} · {r.contact_email}
        </p>
        {[
          r.layout ? setupLabel(r.layout) : null,
          r.layout === "tables" ? tablesSummary(r.tables) : null,
          r.equipment && Object.keys(r.equipment).length ? equipmentSummary(r.equipment) : null,
          r.food ? foodLabel(r.food) : null,
        ].some(Boolean) ? (
          <p className="text-[0.88rem] text-ink-mute">
            {[
              r.layout ? setupLabel(r.layout) : null,
              r.layout === "tables" ? tablesSummary(r.tables) : null,
              r.equipment && Object.keys(r.equipment).length ? equipmentSummary(r.equipment) : null,
              r.food ? foodLabel(r.food) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {r.purpose ? <p className="max-w-2xl text-[0.88rem] italic text-ink-mute">&ldquo;{r.purpose}&rdquo;</p> : null}
      </div>
      {readOnly ? null : transitions.length ? (
        <QueueActions id={r.id} current={r.status} transitions={transitions} onSet={setReservationStatus} />
      ) : null}
    </li>
  );

  const empty = (msg: string) => (
    <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">{msg}</p>
  );

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Room requests"
        lead="Ministries ask for rooms here. Each request holds its rooms until you decide. Approve or decline it, and the person who asked gets an email either way."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live reservations.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Waiting for you" value={pending.length} tone="clay" />
        <Stat label="Approved, coming up" value={approved.length} tone="moss" />
        <Stat label="Past, declined or cancelled" value={past.length} />
      </div>

      <AdminPanel title="Waiting for you">
        {pending.length
          ? (
            <ul className="divide-y divide-rule">
              {pending.map((r) =>
                row(r, [
                  { label: "Approve", status: "approved", tone: "go", confirm: "Approve this request? The person who asked will get an email." },
                  { label: "Decline", status: "rejected", tone: "stop", confirm: "Decline this request? The person who asked will get an email, and the rooms are freed." },
                ]),
              )}
            </ul>
          )
          : empty("All done. No requests are waiting.")}
      </AdminPanel>

      <AdminPanel title="Approved, coming up">
        {approved.length
          ? (
            <ul className="divide-y divide-rule">
              {approved.map((r) =>
                row(r, [
                  { label: "Cancel", status: "cancelled", tone: "stop", confirm: "Cancel this approved booking? The person who asked will get an email, and the rooms are freed." },
                ]),
              )}
            </ul>
          )
          : empty("No approved bookings coming up.")}
      </AdminPanel>

      <AdminPanel title="Past, declined or cancelled">
        {past.length
          ? (
            <ul className="divide-y divide-rule">
              {past.map((r) =>
                row(r, r.first.ends_at < now ? [] : [{ label: "Reopen", status: "pending", confirm: "Put this request back in \"Waiting for you\"? It will hold its rooms again." }]),
              )}
            </ul>
          )
          : empty("Nothing yet.")}
      </AdminPanel>

    </div>
  );
}

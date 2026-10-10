import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, Stat } from "../admin-ui";
import { DgroupReview } from "./review";
import { cx } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-auth";
import { AUDIENCES, DGROUP_STATUS, WHERE, labelOf, scheduleText } from "@/lib/dgroup-registry";
import { fmtDayShort } from "@/lib/format";
import { nightLabel } from "@/lib/dgroup-tables";
import { getRegisteredDgroups } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dgroups" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "approved", label: "Approved" },
  { id: "returned", label: "Sent back or declined" },
  { id: "stopped", label: "Stopped meeting" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const inTab: Record<Tab, (s: string) => boolean> = {
  waiting: (s) => s === "pending",
  approved: (s) => s === "approved",
  returned: (s) => s === "changes_requested" || s === "declined",
  stopped: (s) => s === "archived",
};

const TONE = {
  clay: "bg-clay-wash text-clay-deep",
  moss: "bg-moss/15 text-moss",
  sky: "bg-sky-wash text-sky",
  ink: "bg-ink/10 text-ink-soft",
};

/**
 * The Dgroup registry (2026-10-08), replacing the template's page of sample
 * groups and an enquiry queue nothing fed (joining goes through CCF Main's
 * JotForm). Leaders register at /my/dgroups; the team approves here. Only
 * admins see this list.
 */
export default async function AdminDgroups({ searchParams }: PageProps<"/admin/dgroups">) {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const sp = await searchParams;
  const all = await getRegisteredDgroups();
  const waiting = all.filter((d) => d.status === "pending");
  const tab: Tab = TABS.find((t) => t.id === sp.tab)?.id ?? (waiting.length ? "waiting" : "approved");
  const list = all.filter((d) => inTab[tab](d.status));
  const approved = all.filter((d) => d.status === "approved");

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Dgroups"
        lead="Dgroups registered by their leaders. Approve them here; approved groups book Dgroup tables in one tap. People looking to join one still sign up through CCF's form."
      />
      {!hasSupabase() ? <AdminNote>Not connected to a database.</AdminNote> : noCode ? <AdminNote>Read-only: no admin code is configured.</AdminNote> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Waiting for approval" value={waiting.length} tone="clay" />
        <Stat label="Approved Dgroups" value={approved.length} tone="moss" />
        <Stat label="Open to new members" value={approved.filter((d) => d.is_open).length} />
        <Stat label="Meet at Centris" value={approved.filter((d) => d.meets_where === "centris").length} />
      </div>

      <nav className="no-bar -mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Dgroups">
        {TABS.map((t) => {
          const n = all.filter((d) => inTab[t.id](d.status)).length;
          return (
            <Link
              key={t.id}
              href={`/admin/dgroups?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cx(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[0.92rem] font-semibold transition-colors",
                tab === t.id ? "bg-ink text-paper-bright" : "border border-hairline bg-paper-bright text-ink-soft hover:border-ink",
              )}
            >
              {t.label}
              <span className={cx("rounded-full px-1.5 text-[0.78rem] tabular-nums", tab === t.id ? "bg-paper-bright/20" : t.id === "waiting" && n ? "bg-clay-wash text-clay-deep" : "bg-ink/10")}>
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      {list.length ? (
        <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-paper-bright">
          {list.map((d) => {
            const st = DGROUP_STATUS[d.status] ?? DGROUP_STATUS.pending;
            return (
              <li key={d.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cx("rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold", TONE[st.tone])}>{st.label}</span>
                    <span className="rounded-full bg-clay-wash px-2.5 py-0.5 text-[0.78rem] font-semibold text-clay-deep">{labelOf(AUDIENCES, d.audience)}</span>
                    {d.status === "approved" ? (
                      <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-[0.78rem] font-semibold text-ink-soft">
                        {d.is_open ? "Open to new members" : "Full"}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-[1.15rem] font-bold leading-snug text-ink">{d.name}</h2>
                  <p className="mt-1 text-[0.95rem] text-ink-soft">
                    {scheduleText(d)} · {d.meets_where === "elsewhere" && d.general_area ? d.general_area : labelOf(WHERE, d.meets_where)} · {d.current_size} in the group
                  </p>
                  <p className="mt-1 text-[0.92rem] text-ink-mute">
                    Led by <span className="font-semibold text-ink">{d.leader_name}</span>
                    {d.co_leader_name ? ` and ${d.co_leader_name}` : ""} · {d.leader_mobile}
                    {d.leader_email ? (
                      <>
                        {" · "}
                        <a href={`mailto:${d.leader_email}`} className="text-clay underline underline-offset-2">
                          {d.leader_email}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[0.92rem] text-ink-mute">
                    Their Dgroup leader:{" "}
                    {d.upline_name ? (
                      <>
                        <span className="font-semibold text-ink">{d.upline_name}</span>
                        {d.upline_mobile ? (
                          <>
                            {" · "}
                            <a href={`tel:${d.upline_mobile.replace(/\s/g, "")}`} className="text-clay underline underline-offset-2">
                              {d.upline_mobile}
                            </a>
                          </>
                        ) : null}
                      </>
                    ) : (
                      "not given (registered before this was asked)"
                    )}
                  </p>
                  {d.description ? <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-ink-soft">{d.description}</p> : null}
                  <p className="mt-2 text-[0.82rem] text-ink-mute">
                    Registered {fmtDayShort(d.created_at)}
                    {d.bookings ? ` · ${d.bookings} table ${d.bookings === 1 ? "booking" : "bookings"}, last ${nightLabel(d.last_booked!)}` : ""}
                  </p>
                  {d.review_note && (d.status === "changes_requested" || d.status === "declined") ? (
                    <p className="mt-2 rounded-lg bg-sky-wash px-3 py-2 text-[0.88rem] text-ink">
                      <span className="font-semibold">Your note:</span> {d.review_note}
                    </p>
                  ) : null}
                </div>
                <div className="lg:border-l lg:border-hairline lg:pl-5">
                  {readOnly ? <p className="text-[0.9rem] text-ink-mute">Read-only</p> : <DgroupReview id={d.id} status={d.status} />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-edge bg-paper-bright px-5 py-12 text-center text-[0.98rem] text-ink-soft">
          {tab === "waiting"
            ? "Nothing waiting. Leaders register their Dgroups from their account, at My Dgroups."
            : tab === "approved"
              ? "No approved Dgroups yet."
              : "Nothing here."}
        </div>
      )}

      <AdminNote>
        Leaders register from their account (account menu → My Dgroups, or ccfcentris.org.ph/my/dgroups). Approving emails them, and their Dgroup then
        shows up when they book a Dgroup table. Only admins see this list.
      </AdminNote>
    </div>
  );
}

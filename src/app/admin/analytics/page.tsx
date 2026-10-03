import type { Metadata } from "next";
import { AdminHeader, AdminNote, AdminPanel, Stat } from "../admin-ui";
import { getSiteStats } from "@/lib/queries";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

/** Vercel Web Analytics for this project: visits, pages, devices, countries. */
const VISITS_URL = "https://vercel.com/ccf-centris/ccf-centris/analytics";

/**
 * Privacy-conscious analytics, from real data (2026-10-03; the template's
 * figures were invented). Operational only: how the site, the tables and the
 * rooms get used. Nothing ranks people or tracks anyone's spiritual activity.
 */
export default async function AdminAnalytics() {
  await requireAdmin();
  const s = await getSiteStats();
  const or = (v: string | null) => v ?? "—";

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Analytics"
        lead="How the site, the tables and the rooms get used. Operational measures only: nothing here ranks people or tracks anyone's spiritual activity."
      />

      <AdminPanel
        title="Visits"
        action={
          <a
            href={VISITS_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-press inline-flex min-h-10 items-center rounded-lg bg-clay px-4 text-[0.92rem] font-semibold text-paper-bright hover:bg-clay-deep"
          >
            Open visitor stats
          </a>
        }
      >
        <p className="px-5 py-4 text-[0.92rem] leading-relaxed text-ink-soft">
          Page views, visitors, top pages, devices and countries are counted by Vercel Web Analytics, without cookies
          or personal data. Staff pages under /admin aren&rsquo;t counted. Open it with the Vercel account that runs
          the site.
        </p>
      </AdminPanel>

      {!s ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to see
          the numbers below.
        </AdminNote>
      ) : (
        <>
          <AdminPanel title="Accounts">
            <div className="grid gap-px bg-hairline sm:grid-cols-2">
              <Stat label="Members with accounts" value={s.members.total} tone="clay" />
              <Stat label="Joined in the last 30 days" value={s.members.joined30} />
            </div>
          </AdminPanel>

          <AdminPanel title="Dgroup tables">
            <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Booked ahead" value={s.tables.upcoming} tone="clay" />
              <Stat label="Bookings made" value={s.tables.booked30} note="Last 30 days" />
              <Stat label="People at tables" value={s.tables.people30} note="Last 30 days" />
              <Stat
                label="Cancelled"
                value={s.tables.cancelRate === null ? "—" : `${s.tables.cancelRate}%`}
                note="Of bookings made in the last 90 days"
              />
              <Stat label="Busiest time" value={or(s.tables.busiestSlot)} note="Last 90 days" />
              <Stat label="Busiest day" value={or(s.tables.busiestDay)} note="Last 90 days" />
              <Stat label="Dgroup Lounge" value={s.tables.lounge} note="Bookings, last 90 days" />
              <Stat label="Welcome Center" value={s.tables.welcome} note="Bookings, last 90 days" />
            </div>
          </AdminPanel>

          <AdminPanel title="Room requests">
            <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Requests" value={s.rooms.requests30} note="Last 30 days" />
              <Stat label="Awaiting approval" value={s.rooms.awaiting} tone="clay" />
              <Stat label="Approved, coming up" value={s.rooms.approvedAhead} tone="moss" />
              <Stat label="Most requested" value={or(s.rooms.topRoom)} note="Last 90 days" />
            </div>
          </AdminPanel>

          <AdminPanel title="Prayer Wall">
            <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Open requests" value={s.prayer.open} tone="clay" />
              <Stat label="Posted" value={s.prayer.posted30} note="Last 30 days" />
              <Stat label="Times prayed" value={s.prayer.prayers} note="“I prayed” taps, all time" />
              <Stat label="Answered" value={s.prayer.answered} tone="moss" note="Marked by their authors" />
            </div>
          </AdminPanel>
        </>
      )}

      <AdminNote>
        What is deliberately absent: individual attendance, giving by person, engagement scores, and any leaderboard.
        Those would turn discipleship into a metric, which is the opposite of what this site is for.
      </AdminNote>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, AdminPanel, Stat, Status, Table, Td } from "../admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { courtsLabel, dayLabel, peso, sportName, timeRange } from "@/lib/court-rentals";
import { manilaDateKey } from "@/lib/format";
import { getCourtRentals, type CourtRental } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Court rentals" };
export const dynamic = "force-dynamic";

/**
 * Gym court rentals (Adrian, 2026-10-20). They're confirmed the moment the
 * renter uploads a payment screenshot, so like the Dgroup tables this is a
 * list to keep an eye on: open one to see its screenshot, and cancel it if
 * the payment isn't there.
 */
export default async function AdminCourts() {
  await requireAdmin();
  const rentals = await getCourtRentals();
  const today = manilaDateKey();

  const upcoming = rentals.filter((r) => r.status === "confirmed" && r.booked_on >= today);
  const past = rentals.filter((r) => r.status === "confirmed" && r.booked_on < today).reverse();
  const cancelled = rentals.filter((r) => r.status === "cancelled").reverse();
  const paidAhead = upcoming.reduce((n, r) => n + r.amount_php, 0);

  const row = (r: CourtRental) => (
    <tr key={r.id}>
      <Td>
        <span className="font-semibold">{r.renter_name}</span>
        {r.dgroup_name ? <span className="block text-[0.85rem] text-clay-deep">{r.dgroup_name}</span> : null}
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{r.contact_mobile}</span>
      </Td>
      <Td>
        {dayLabel(r.booked_on)}
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{timeRange(r.start_hour, r.hours)}</span>
      </Td>
      <Td>
        <span className="font-semibold">{sportName(r.sport)}</span>
        <span className="mt-0.5 block text-[0.82rem] text-ink-mute">{courtsLabel(r.sport, r.court_numbers)}</span>
      </Td>
      <Td className="tabular-nums">{peso(r.amount_php)}</Td>
      <Td>
        <Status value={r.status} />
      </Td>
      <Td>
        <Link href={`/admin/courts/${r.id}`} className="font-semibold text-clay underline underline-offset-4">
          See payment
        </Link>
      </Td>
    </tr>
  );

  const cols = ["Renter", "When", "Sport", "Paid", "Status", ""];
  const empty = (msg: string) => <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">{msg}</p>;

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Court rentals"
        lead="Rentals in the Gym confirm as soon as the renter uploads a payment screenshot. Open one to check the payment; cancel it there if the money isn't in, and the renter is told and the courts are freed."
      />

      {!hasSupabase() ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to see live rentals.
        </AdminNote>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming" value={upcoming.length} tone="clay" />
        <Stat label="Paid for upcoming" value={peso(paidAhead)} tone="moss" />
        <Stat label="Cancelled" value={cancelled.length} />
      </div>

      <AdminPanel title="Upcoming">
        {upcoming.length ? <Table columns={cols}>{upcoming.map(row)}</Table> : empty("No rentals ahead.")}
      </AdminPanel>

      <AdminPanel title="Past">
        {past.length ? <Table columns={cols}>{past.map(row)}</Table> : empty("Nothing yet.")}
      </AdminPanel>

      <AdminPanel title="Cancelled">
        {cancelled.length ? <Table columns={cols}>{cancelled.map(row)}</Table> : empty("Nothing yet.")}
      </AdminPanel>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, Status } from "../../admin-ui";
import { QueueActions } from "../../queue-actions";
import { setCourtRentalStatus } from "@/app/actions/court-rentals";
import { requireAdmin } from "@/lib/admin-auth";
import { courtsLabel, dayLabel, manilaHour, peso, sportName, timeRange } from "@/lib/court-rentals";
import { fmtDayLong, fmtTime, manilaDateKey } from "@/lib/format";
import { proofUrl } from "@/lib/payment-proofs";
import { getCourtRental } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Court rental" };
export const dynamic = "force-dynamic";

/**
 * One Gym rental and its payment screenshot (Adrian, 2026-10-20). The
 * screenshot is private: it's shown only to a signed-in admin, through a link
 * that stops working after ten minutes. Rentals on Today, This week and the
 * Room calendar open here.
 */
export default async function CourtRentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const { id } = await params;
  const r = await getCourtRental(id);

  if (!r) {
    return (
      <div className="space-y-6">
        <AdminHeader title="Court rental" />
        <AdminNote>That rental could not be found.</AdminNote>
        <Link href="/admin/courts" className="font-semibold text-clay underline underline-offset-4">
          ← Court rentals
        </Link>
      </div>
    );
  }

  // Without the access code the console is open to anyone, so no screenshots then.
  const picture = noCode ? null : await proofUrl(r.payment_proof);
  const today = manilaDateKey();
  const past = r.booked_on < today || (r.booked_on === today && r.start_hour + r.hours <= manilaHour());

  const details: [string, string][] = [
    ["When", `${dayLabel(r.booked_on)}, ${timeRange(r.start_hour, r.hours)}`],
    ["Sport", sportName(r.sport)],
    ["Courts", courtsLabel(r.sport, r.court_numbers)],
    ["Paid", peso(r.amount_php)],
    ["Renter", r.renter_name],
    ["Dgroup", r.dgroup_name ?? "Not linked"],
    ["Mobile", r.contact_mobile],
    ["Email", r.renter_email],
    ["Booked on", `${fmtDayLong(r.created_at)}, ${fmtTime(r.created_at)}`],
    ...(r.changed_at ? ([["Moved on", `${fmtDayLong(r.changed_at)}, ${fmtTime(r.changed_at)}`]] as [string, string][]) : []),
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/courts" className="text-[0.92rem] font-semibold text-clay underline underline-offset-4">
        ← Court rentals
      </Link>
      <AdminHeader
        title={`${sportName(r.sport)} · ${r.renter_name}`}
        lead="Check that the payment screenshot shows the right amount, paid to CCF Centris. If it doesn't, cancel the rental: the renter gets an email and the courts are freed."
        action={<Status value={r.status === "confirmed" && past ? "completed" : r.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <dl className="grid gap-x-8 gap-y-3 rounded-xl border border-hairline bg-paper-bright p-5 sm:grid-cols-2 sm:p-6">
          {details.map(([k, v]) => (
            <div key={k} className="flex gap-3 border-b border-rule pb-2 last:border-0">
              <dt className="w-28 shrink-0 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-ink-mute">{k}</dt>
              <dd className="min-w-0 text-[0.98rem] text-ink [overflow-wrap:anywhere]">{v}</dd>
            </div>
          ))}
        </dl>

        <figure className="rounded-xl border border-hairline bg-paper-bright p-4">
          <figcaption className="text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-ink-mute">Payment screenshot</figcaption>
          {picture ? (
            <a href={picture} target="_blank" rel="noreferrer" className="mt-3 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={picture} alt={`Payment screenshot from ${r.renter_name}`} className="h-auto w-full rounded-lg border border-hairline" />
              <span className="mt-2 block text-[0.88rem] font-semibold text-clay underline underline-offset-4">Open full size</span>
            </a>
          ) : (
            <p className="mt-3 text-[0.95rem] text-ink-mute">
              {noCode ? "Sign in with the admin code to see the screenshot." : "The screenshot couldn't be loaded. Refresh the page to try again."}
            </p>
          )}
        </figure>
      </div>

      {readOnly || r.status !== "confirmed" || past ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.95rem] font-semibold text-ink">Payment not there?</span>
          <QueueActions
            id={r.id}
            current={r.status}
            transitions={[
              {
                label: "Cancel rental",
                status: "cancelled",
                tone: "stop",
                confirm: "Cancel this rental? The renter will get an email saying it was cancelled, and the courts are freed.",
              },
            ]}
            onSet={setCourtRentalStatus}
          />
        </div>
      )}
    </div>
  );
}

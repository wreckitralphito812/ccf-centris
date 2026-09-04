import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Container, Section, cx } from "@/components/ui";
import { getMyBookings, type MyBooking } from "@/lib/queries";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = {
  title: "My reservations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-50 text-amber-800",
  approved: "border-emerald-600/30 bg-emerald-50 text-emerald-800",
  rejected: "border-clay/40 bg-clay/8 text-clay-deep",
  cancelled: "border-ink/20 bg-bone text-ink-mute",
  completed: "border-ink/20 bg-bone text-ink-soft",
};

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cx(
        "label inline-flex border px-2 py-1",
        TONE[value] ?? "border-ink/20 text-ink",
      )}
    >
      {value}
    </span>
  );
}

function BookingCard({ b }: { b: MyBooking }) {
  const upcoming = new Date(b.ends_at).getTime() > Date.now();
  const cancellable = upcoming && (b.status === "pending" || b.status === "approved");

  return (
    <div className="border border-hairline bg-paper-bright p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">
            {b.court_name ?? b.facility_name ?? "Reservation"}
          </h2>
          <p className="mt-0.5 text-[0.85rem] text-ink-mute">
            {b.court_name ? b.facility_name : b.activity_name ?? " "}
          </p>
        </div>
        <StatusPill value={b.status} />
      </div>

      <dl className="mt-4 grid gap-x-8 gap-y-2 text-[0.9rem] sm:grid-cols-2">
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-ink-mute">When</dt>
          <dd className="font-medium">
            {fmtDayLong(b.starts_at)}, {fmtTime(b.starts_at)} – {fmtTime(b.ends_at)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-ink-mute">Party</dt>
          <dd className="font-medium tabular-nums">{b.participants}</dd>
        </div>
      </dl>

      {cancellable ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <CancelButton id={b.id} />
        </div>
      ) : null}
    </div>
  );
}

export default async function MyReservationsPage() {
  const bookings = await getMyBookings();
  const upcoming = bookings.filter(
    (b) =>
      new Date(b.ends_at).getTime() > Date.now() &&
      b.status !== "cancelled" &&
      b.status !== "rejected",
  );
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title="Your reservations."
        lead="Everything you've booked at CCF Centris. Cancel at least 24 hours ahead if plans change."
      />
      <Section>
        <Container className="max-w-3xl space-y-10">
          <div>
            <h2 className="label text-ink-mute">Upcoming</h2>
            <div className="mt-4 space-y-4">
              {upcoming.length ? (
                upcoming.map((b) => <BookingCard key={b.id} b={b} />)
              ) : (
                <p className="border border-hairline bg-paper-bright p-6 text-[0.9rem] text-ink-soft">
                  Nothing booked yet.{" "}
                  <Link href="/centris/reserve" className="text-clay underline underline-offset-4">
                    Reserve a court or a room
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>

          {past.length ? (
            <div>
              <h2 className="label text-ink-mute">Past &amp; cancelled</h2>
              <div className="mt-4 space-y-4">
                {past.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </div>
            </div>
          ) : null}
        </Container>
      </Section>
    </>
  );
}

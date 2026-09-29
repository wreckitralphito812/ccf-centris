import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Container, Section, cx } from "@/components/ui";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { getMyBookings, getMyDgroupBookings, type MyBooking } from "@/lib/queries";
import { fmtDayLong, fmtTime, manilaDateKey } from "@/lib/format";
import {
  manilaMinutes,
  nightLabel,
  nightOptions,
  roomName,
  slotLabel,
  tablesLabel,
} from "@/lib/dgroup-tables";
import { MyBooking as DgroupBooking } from "@/app/reserve/dgroup/my-booking";
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

/** Plain words for each status, as a member would say it. */
const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting approval",
  approved: "Confirmed",
  rejected: "Declined",
  cancelled: "Cancelled",
  completed: "Done",
};

function StatusPill({ value }: { value: string }) {
  return (
    <span className={cx("label inline-flex border px-2 py-1", TONE[value] ?? "border-ink/20 text-ink")}>
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

function BookingCard({ b }: { b: MyBooking }) {
  const upcoming = new Date(b.ends_at).getTime() > Date.now();
  const cancellable = upcoming && (b.status === "pending" || b.status === "approved");

  return (
    <li className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label text-clay">{b.court_name ? "Court" : "Room"}</p>
          <p className="font-display mt-1 text-2xl text-ink">
            {b.court_name ?? b.facility_name ?? "Reservation"}
          </p>
          <p className="mt-1 text-[0.95rem] text-ink-soft">
            {[
              `${fmtDayLong(b.starts_at)}, ${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}`,
              b.court_name ? b.facility_name : b.activity_name,
              `${b.participants} ${b.participants === 1 ? "person" : "people"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <StatusPill value={b.status} />
      </div>
      {cancellable ? (
        <div className="mt-4">
          <CancelButton id={b.id} />
        </div>
      ) : null}
    </li>
  );
}

export default async function MyReservationsPage() {
  const today = manilaDateKey();
  const [bookings, tables] = await Promise.all([getMyBookings(), getMyDgroupBookings(today)]);
  const nights = nightOptions(today, manilaMinutes());

  const upcoming = bookings
    .filter(
      (b) =>
        new Date(b.ends_at).getTime() > Date.now() &&
        b.status !== "cancelled" &&
        b.status !== "rejected",
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = bookings.filter((b) => !upcoming.includes(b));
  const nothing = !tables.length && !upcoming.length;

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title="Your reservations."
        lead="Everything you've booked at CCF Centris, in one place. Change or cancel at least 24 hours ahead if plans change."
      />
      <Section>
        <Container className="max-w-3xl space-y-12">
          {nothing ? (
            <div className="surface p-6">
              <p className="text-ink">Nothing booked yet.</p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                <Link href="/reserve/dgroup" className="label text-clay underline underline-offset-4">
                  Book a Dgroup table
                </Link>
                <Link href="/centris/reserve" className="label text-clay underline underline-offset-4">
                  Book a court or room
                </Link>
              </div>
            </div>
          ) : null}

          {tables.length ? (
            <section aria-labelledby="tables-h">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="tables-h" className="label text-ink-mute">
                  Dgroup tables
                </h2>
                <Link href="/reserve/dgroup" className="label text-clay underline underline-offset-4">
                  Book another
                </Link>
              </div>
              <ul className="mt-4 space-y-4">
                {tables.map((m) => (
                  <DgroupBooking
                    key={m.id}
                    id={m.id}
                    title={`${tablesLabel(m.table_labels)} · ${roomName(m.room_slug)}`}
                    when={`${nightLabel(m.booked_on)}, ${slotLabel(m.slot_id)}`}
                    groupSize={m.group_size}
                    date={m.booked_on}
                    slotId={m.slot_id}
                    nights={nights}
                    plan={<FloorPlanDrawing room={m.room_slug} highlight={m.table_labels} width={280} />}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {upcoming.length ? (
            <section aria-labelledby="spaces-h">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="spaces-h" className="label text-ink-mute">
                  Courts and rooms
                </h2>
                <Link href="/centris/reserve" className="label text-clay underline underline-offset-4">
                  Book another
                </Link>
              </div>
              <ul className="mt-4 space-y-4">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </ul>
            </section>
          ) : null}

          {past.length ? (
            <details className="group">
              <summary className="label cursor-pointer list-none text-ink-mute underline underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
                Past and cancelled ({past.length})
              </summary>
              <ul className="mt-4 space-y-4">
                {past.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </ul>
            </details>
          ) : null}
        </Container>
      </Section>
    </>
  );
}

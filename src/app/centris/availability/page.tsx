import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { getFacility, getSportsToday } from "@/lib/queries";
import { addDaysKey, fmtDayLong, fmtTime, manilaDateKey } from "@/lib/format";

export const metadata: Metadata = {
  title: "Court availability",
  description:
    "Live court availability at the CCF Centris Sports Hall: basketball, badminton, and pickleball, hour by hour.",
};

/** Availability is time-sensitive, so never serve a stale page. */
export const dynamic = "force-dynamic";

const STATE_STYLE = {
  available: "bg-moss/15 text-moss border-moss/30",
  reserved: "bg-ink/8 text-ink-mute border-transparent",
  pending: "bg-clay/12 text-clay-deep border-clay/30",
  unavailable: "bg-transparent text-ink-mute/40 border-transparent",
} as const;

const STATE_LABEL = {
  available: "Available",
  reserved: "Reserved",
  pending: "Pending",
  unavailable: "Past",
} as const;

export default async function AvailabilityPage({
  searchParams,
}: PageProps<"/centris/availability">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.date) ? sp.date[0] : sp.date;
  const today = manilaDateKey();
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;

  const [hall, courts] = await Promise.all([
    getFacility("sports-hall"),
    getSportsToday(date),
  ]);

  const hours = courts[0]?.slots.map((s) => s.start) ?? [];

  // A week of tabs, starting today.
  const week = Array.from({ length: 7 }, (_, i) => addDaysKey(today, i));

  return (
    <>
      <PageHeader
        eyebrow="Court availability"
        title="What&rsquo;s free in the Sports Hall."
        lead="Live availability across every court. Booking details of other people are never shown."
        actions={
          <>
            <ButtonLink href="/centris/reserve" size="lg">
              Reserve a court
            </ButtonLink>
            <ButtonLink href="/centris/sports" tone="outline" size="lg">
              Sports at Centris
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          {/* Day picker */}
          <nav aria-label="Choose a date" className="no-bar flex gap-2 overflow-x-auto pb-2">
            {week.map((d) => {
              const active = d === date;
              return (
                <Link
                  key={d}
                  href={d === today ? "/centris/availability" : `/centris/availability?date=${d}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "label shrink-0 border border-clay bg-clay px-4 py-2.5 text-paper-bright"
                      : "label shrink-0 border border-ink/25 px-4 py-2.5 text-ink transition-colors hover:border-ink"
                  }
                >
                  {d === today ? "Today" : fmtDayLong(`${d}T12:00:00+08:00`).split(",")[0].slice(0, 3)}
                  <span className="ml-2 opacity-60">{d.slice(8)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-hairline py-4">
            <p className="font-display text-2xl">
              {fmtDayLong(`${date}T12:00:00+08:00`)}
            </p>
            <div className="flex flex-wrap gap-4">
              {(["available", "pending", "reserved"] as const).map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-2 text-[0.8rem] text-ink-mute"
                >
                  <span
                    aria-hidden
                    className={`h-3 w-3 border ${STATE_STYLE[s]}`}
                  />
                  {STATE_LABEL[s]}
                </span>
              ))}
            </div>
          </div>

          {/* Grid. Scrolls horizontally rather than squeezing the page. */}
          <div className="mt-6 overflow-x-auto border border-hairline">
            <table className="w-full min-w-[52rem] border-collapse">
              <caption className="sr-only">
                Court availability for {fmtDayLong(`${date}T12:00:00+08:00`)}
              </caption>
              <thead>
                <tr className="bg-paper-bright">
                  <th
                    scope="col"
                    className="label sticky left-0 z-10 border-b border-r border-hairline bg-paper-bright px-4 py-3 text-left text-ink-mute"
                  >
                    Court
                  </th>
                  {hours.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="label border-b border-hairline px-1 py-3 text-center text-ink-mute"
                    >
                      {fmtTime(h).replace(":00", "").replace(" ", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courts.map(({ court, slots }) => (
                  <tr key={court.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-hairline bg-paper-bright px-4 py-3 text-left"
                    >
                      <span className="block text-[0.9rem] font-semibold">
                        {court.name}
                      </span>
                      <span className="label block text-ink-mute">
                        {court.sport}
                      </span>
                    </th>
                    {slots.map((s) => (
                      <td key={s.start} className="border-b border-hairline p-0.5">
                        <span
                          title={`${fmtTime(s.start)} — ${STATE_LABEL[s.state]}`}
                          className={`block h-9 border ${STATE_STYLE[s.state]}`}
                        >
                          <span className="sr-only">
                            {fmtTime(s.start)} {STATE_LABEL[s.state]}
                          </span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Next free, summarised. Easier to read than the grid on a phone. */}
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {courts.map(({ court, nextFree, busyUntil }) => (
              <div key={court.id} className="bg-paper-bright p-5">
                <p className="label text-ink-mute">{court.sport}</p>
                <h2 className="font-display mt-1 text-xl">{court.name}</h2>
                {nextFree ? (
                  <>
                    <p className="mt-4 text-[0.8rem] text-ink-mute">
                      {busyUntil ? "Next free" : "Free from"}
                    </p>
                    <p className="font-display text-2xl text-moss">
                      {fmtTime(nextFree.start)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-[0.8rem] text-ink-mute">This day</p>
                    <p className="font-display text-2xl text-ink-mute">
                      Fully booked
                    </p>
                  </>
                )}
                <ButtonLink
                  href={`/centris/reserve?facility=sports-hall&court=${court.id}&date=${date}`}
                  tone="outline"
                  size="sm"
                  full
                  className="mt-4"
                >
                  Book this court
                </ButtonLink>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-2xl text-[0.85rem] leading-relaxed text-ink-mute">
            The hall is open {hall?.open_time.slice(0, 5)} to{" "}
            {hall?.close_time.slice(0, 5)} daily. Availability reflects
            confirmed and pending bookings. Who booked a slot, and what for, is
            never shown publicly.
          </p>
        </Container>
      </Section>
    </>
  );
}

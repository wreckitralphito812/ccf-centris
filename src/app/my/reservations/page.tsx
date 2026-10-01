import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { manilaMinutes, nightOptions, rebookDate } from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { mergeUpcoming, type Upcoming } from "@/lib/my-bookings";
import { getMyBookings, getMyDgroupBookings } from "@/lib/queries";
import { referenceFor } from "@/lib/reference";
import { LaterRow, NextUp, PastRow } from "./parts";

export const metadata: Metadata = {
  title: "My reservations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Everything a member has booked, soonest first (design review 2026-09-30,
 * after Calendly): the next booking as a big card with every action, the rest
 * as rows that open to Manage, and past bookings folded away.
 */
export default async function MyReservationsPage() {
  const today = manilaDateKey();
  const now = manilaMinutes();
  const [tables, rooms] = await Promise.all([getMyDgroupBookings(today), getMyBookings()]);
  const upcoming = mergeUpcoming(tables, rooms);
  const [next, ...later] = upcoming;
  const past = rooms.filter((r) => !upcoming.some((u) => u.id === r.id));
  const nights = nightOptions(today, now);

  const rebook = (u: Upcoming) => (u.table ? rebookDate(u.table.booked_on, u.table.slot_id, today, now) : null);
  const reference = (u: Upcoming) =>
    referenceFor("reservation", u.room?.request_group ?? u.id);

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title="Your reservations."
        lead="Everything you’ve booked at CCF Centris, soonest first. If plans change, cancel early so someone else can use the space."
      />
      <Section tone="mist">
        <Container className="max-w-3xl space-y-10 lg:max-w-5xl">
          {next ? (
            <NextUp item={next} today={today} nights={nights} rebookTarget={rebook(next)} reference={reference(next)} />
          ) : (
            <div className="calm-card px-8 py-12 text-center">
              <p className="text-[1.4rem] font-semibold text-ink">Nothing booked yet.</p>
              <p className="mt-2 text-[1rem] text-ink-mute">Book a table for your Dgroup or a room for your ministry.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/reserve/dgroup" size="lg">
                  Book a Dgroup table
                </ButtonLink>
                <ButtonLink href="/centris/reserve" size="lg" tone="outline">
                  Request a room
                </ButtonLink>
              </div>
            </div>
          )}

          {later.length ? (
            <section aria-labelledby="later-h">
              <h2 id="later-h" className="text-[1.2rem] font-semibold text-ink">
                Later
              </h2>
              <ul className="calm-card mt-4 divide-y divide-rule overflow-hidden">
                {later.map((u) => (
                  <LaterRow key={u.id} item={u} nights={nights} rebookTarget={rebook(u)} reference={reference(u)} />
                ))}
              </ul>
            </section>
          ) : null}

          {past.length ? (
            <details className="calm-card group overflow-hidden">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-6 py-4 text-[1rem] font-semibold text-ink hover:bg-mist [&::-webkit-details-marker]:hidden">
                Past and cancelled ({past.length})
                <span className="text-[0.95rem] text-clay group-open:hidden">Show</span>
                <span className="hidden text-[0.95rem] text-ink-mute group-open:inline">Hide</span>
              </summary>
              <ul className="divide-y divide-rule border-t border-rule">
                {past.map((r) => (
                  <PastRow key={r.id} r={r} />
                ))}
              </ul>
            </details>
          ) : null}
        </Container>
      </Section>
    </>
  );
}

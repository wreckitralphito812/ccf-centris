import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Eyebrow, Section, SectionHead } from "@/components/ui";
import {
  getAddons,
  getCourtSlots,
  getFacility,
  getReservableFacilities,
} from "@/lib/queries";
import { addDaysKey, manilaDateKey } from "@/lib/format";
import { BookingFlow } from "./booking";

export const metadata: Metadata = {
  title: "Reserve a space",
  description:
    "Book a basketball, badminton, or pickleball court, or request a multipurpose hall at CCF Centris. Open to the community.",
};

/** Availability is live, so this page is never cached. */
export const dynamic = "force-dynamic";

export default async function ReservePage({
  searchParams,
}: PageProps<"/centris/reserve">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? null;

  const today = manilaDateKey();
  const rawDate = one(sp.date);
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const [facilities, addons, hall] = await Promise.all([
    getReservableFacilities(),
    getAddons(),
    getFacility("sports-hall"),
  ]);

  // Preload every court's grid so the flow never waits on a click.
  const slotsByCourt: Record<string, Awaited<ReturnType<typeof getCourtSlots>>> =
    {};
  if (hall) {
    await Promise.all(
      hall.courts.map(async (c) => {
        slotsByCourt[c.id] = await getCourtSlots("sports-hall", c.id, date);
      }),
    );
  }

  const dateOptions = Array.from({ length: 14 }, (_, i) => addDaysKey(today, i));

  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="Book a court or a room."
        lead="The Sports Hall is open to the community, not just to CCF. Multipurpose halls are available for classes, trainings, and gatherings."
      />

      <Section>
        <Container>
          <BookingFlow
            facilities={facilities}
            addons={addons}
            slotsByCourt={slotsByCourt}
            initialFacility={one(sp.facility)}
            initialCourt={one(sp.court)}
            date={date}
            dateOptions={dateOptions}
          />
        </Container>
      </Section>

      <Section id="policies" tone="deep" className="scroll-mt-24">
        <Container>
          <SectionHead
            eyebrow="Policies"
            title="The rules, plainly"
            lead="Nothing here is designed to catch you out. It exists so the center stays usable for everyone."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Cancelling", "Cancel at least 24 hours ahead and there is no penalty. Repeated no-shows affect future bookings."],
              ["Approval", "Courts are usually instant. Multipurpose halls are a request first, confirmed by the facilities team within a day."],
              ["Payment", "Settled with the facilities team through CCF's own channels. Nothing is charged through this site."],
              ["Footwear", "Non-marking indoor shoes are required on the sport floor. No exceptions, it damages the surface."],
              ["Setup time", "Room bookings must include setup and packing-down time in the window you book."],
              ["Under 16s", "An adult must be present for anyone under 16 using the Sports Hall."],
              ["Recurring bookings", "Weekly or monthly slots can be arranged, but need approval before they hold inventory."],
              ["Blackout dates", "The center closes for some CCF-wide events and holidays. Those dates are blocked in advance."],
              ["Damage and lost property", "Report anything broken to the desk. Lost property is held at the Welcome Center."],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-6">
                <h3 className="font-display text-lg">{t}</h3>
                <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
                  {b}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 border-l-2 border-clay bg-paper-bright py-4 pl-5 pr-4">
            <Eyebrow>Note</Eyebrow>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
              Rates, hours, and policies shown here are representative and will
              be set by the CCF Centris facilities team before the booking
              system opens to the public.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}

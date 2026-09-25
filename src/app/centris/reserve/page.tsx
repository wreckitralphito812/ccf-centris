import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section, SectionHead } from "@/components/ui";
import {
  getCourtSlots,
  getFacility,
  getReservableFacilities,
} from "@/lib/queries";
import { currentUser } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";
import { addDaysKey, manilaDateKey } from "@/lib/format";
import { BookingFlow } from "./booking";

export const metadata: Metadata = {
  title: "Reserve a space",
  description:
    "Book the basketball or pickleball court, or request a multipurpose hall at CCF Centris. Rooms are free for ministries.",
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

  // Booking needs an account. When Supabase isn't configured there are no
  // accounts, so the flow stays open (it just can't actually write).
  const signedIn = !hasSupabase() || Boolean(await currentUser());

  const [facilities, hall] = await Promise.all([
    getReservableFacilities(),
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
        lead="Anyone can book the Sports Hall, CCF member or not. Multipurpose halls are for classes, trainings, and meetings."
      />

      <Section>
        <Container>
          {signedIn ? (
            <BookingFlow
              facilities={facilities}
              slotsByCourt={slotsByCourt}
              initialFacility={one(sp.facility)}
              initialCourt={one(sp.court)}
              date={date}
              dateOptions={dateOptions}
            />
          ) : (
            <div className="mx-auto max-w-xl border border-hairline bg-paper-bright p-8 text-center">
              <Eyebrow>Sign in</Eyebrow>
              <h2 className="mt-3 font-display text-2xl">
                Reserving needs an account
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[0.92rem] leading-relaxed text-ink-soft">
                Sign in so you can see your bookings and cancel if plans change.
                There&rsquo;s no password. We email you a sign-in link.
              </p>
              <div className="mt-6">
                <ButtonLink
                  href={`/sign-in?next=${encodeURIComponent(
                    `/centris/reserve${rawDate ? `?date=${date}` : ""}`,
                  )}`}
                  size="lg"
                >
                  Sign in to continue
                </ButtonLink>
              </div>
              <p className="mt-6 text-[0.85rem] text-ink-mute">
                Just browsing?{" "}
                <Link href="/centris/availability" className="text-clay underline underline-offset-4">
                  Check court availability
                </Link>{" "}
                without signing in.
              </p>
            </div>
          )}
        </Container>
      </Section>

      <Section id="policies" tone="deep" className="scroll-mt-24">
        <Container>
          <SectionHead
            eyebrow="Policies"
            title="Booking rules"
            lead="These keep the center fair for everyone."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Cancelling", "Cancel at least 24 hours ahead and there is no penalty. Repeated no-shows affect future bookings."],
              ["Approval", "Courts are usually instant. Multipurpose halls are a request first, confirmed by the facilities team within a day."],
              ["Payment", "Rooms are free for ministries. Court rates will be posted soon. Nothing is charged through this site."],
              ["Footwear", "Non-marking indoor shoes are required on the sport floor. Other shoes damage the surface, so there are no exceptions."],
              ["Setup time", "Room bookings must include setup and packing-down time in the window you book."],
              ["Under 16s", "An adult must be present for anyone under 16 using the Sports Hall."],
              ["Recurring bookings", "Weekly or monthly slots can be arranged, but need approval first."],
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
              Hours and policies shown here are placeholders and will be set by
              the CCF Centris facilities team before the booking system opens
              to the public.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}

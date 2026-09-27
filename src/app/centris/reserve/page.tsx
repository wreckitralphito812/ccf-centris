import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui";
import {
  getCourtSlots,
  getFacility,
  getMyContact,
  getReservableFacilities,
} from "@/lib/queries";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { addDaysKey, manilaDateKey } from "@/lib/format";
import { BookingFlow } from "./booking";

export const metadata: Metadata = {
  title: "Reserve a space",
  description:
    "Book the basketball or pickleball court, or request a multipurpose hall at CCF Centris. Rooms are free for ministries.",
};

/** The rules everyone needs; the rest sit behind "All rules". */
const KEY_RULES = [
  ["Cancelling", "Cancel at least 24 hours ahead and there is no penalty. Repeated no-shows affect future bookings."],
  ["Approval", "Courts are usually instant. Rooms are a request first, confirmed by the facilities team within a day."],
  ["Payment", "Rooms are free for ministries. Court rates will be posted soon. Nothing is charged through this site."],
] as const;

const MORE_RULES = [
  ["Footwear", "Non-marking indoor shoes are required on the sport floor. Other shoes damage the surface, so there are no exceptions."],
  ["Setup time", "Room bookings must include setup and packing-down time in the window you book."],
  ["Under 16s", "An adult must be present for anyone under 16 using the Sports Hall."],
  ["Recurring bookings", "Weekly or monthly slots can be arranged, but need approval first."],
  ["Blackout dates", "The center closes for some CCF-wide events and holidays. Those dates are blocked in advance."],
  ["Damage and lost property", "Report anything broken to the desk. Lost property is held at the Welcome Center."],
] as const;

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

  // Booking needs an account. When accounts aren't configured there are
  // none, so the flow stays open (it just can't actually write).
  const signedIn = !hasAccounts() || Boolean(await currentUser());

  const [facilities, hall, contact] = await Promise.all([
    getReservableFacilities(),
    getFacility("sports-hall"),
    signedIn ? getMyContact() : null,
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
        lead="Courts are booked by the hour. Rooms are free for ministries and confirmed by the facilities team."
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
              contact={contact}
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
        <Container className="max-w-3xl">
          <h2 className="display-md">Booking rules</h2>
          <Rules rules={KEY_RULES} className="mt-6" />
          <details className="group mt-5">
            <summary className="label cursor-pointer list-none text-clay underline underline-offset-4 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">All rules</span>
              <span className="hidden group-open:inline">Fewer rules</span>
            </summary>
            <Rules rules={MORE_RULES} className="mt-4" />
          </details>
          <p className="mt-8 text-[0.82rem] leading-relaxed text-ink-mute">
            Hours and policies are placeholders until the CCF Centris facilities team sets them
            before booking opens to the public.
          </p>
        </Container>
      </Section>
    </>
  );
}

function Rules({
  rules,
  className,
}: {
  rules: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <dl className={`divide-y divide-hairline border-y border-hairline ${className ?? ""}`}>
      {rules.map(([t, b]) => (
        <div key={t} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
          <dt className="font-semibold text-ink">{t}</dt>
          <dd className="text-[0.92rem] leading-relaxed text-ink-soft">{b}</dd>
        </div>
      ))}
    </dl>
  );
}

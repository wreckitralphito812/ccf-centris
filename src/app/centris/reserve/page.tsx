import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section, SectionHead } from "@/components/ui";
import { getReservableFacilities } from "@/lib/queries";
import { currentUser } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";
import { manilaDateKey } from "@/lib/format";
import { isRequestableRoom } from "@/lib/requestable-rooms";
import { BookingFlow } from "./booking";

export const metadata: Metadata = {
  title: "Request a room",
  description:
    "Request a room at CCF Centris for ministry meetings, trainings and events. Rooms are free, and the facilities team confirms each request.",
};

/** Sign-in state and today's date change per request, so never cache. */
export const dynamic = "force-dynamic";

const POLICIES: [string, string][] = [
  ["Approval", "Every request is checked by the facilities team. We'll email you to confirm before your date. The room isn't yours until then."],
  ["Free for ministries", "Rooms are free for ministry use. Nothing is charged through this site."],
  ["Setup time", "Include setup and pack-down in the time you request, so the room is ready when your people arrive."],
  ["Weekly or monthly use", "Meeting regularly? Mention it in your request and the team will talk it through with you."],
  ["Cancelling", "If plans change, tell us as early as you can so another group can use the room."],
  ["Blackout dates", "The center closes for some CCF-wide events and holidays. Requests on those dates can't be confirmed."],
  ["Damage and lost property", "If something breaks, let the Welcome Center know. Lost items are kept there too."],
];

export default async function ReservePage({
  searchParams,
}: PageProps<"/centris/reserve">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? null;

  const today = manilaDateKey();
  const rawDate = one(sp.date);
  const initialDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= today
      ? rawDate
      : null;

  // Requests need an account. When Supabase isn't configured there are no
  // accounts, so the flow stays open (it just can't actually write).
  const signedIn = !hasSupabase() || Boolean(await currentUser());

  const rooms = (await getReservableFacilities()).filter(isRequestableRoom);
  const rawFacility = one(sp.facility);
  const initialFacility = rooms.some((r) => r.slug === rawFacility)
    ? rawFacility
    : null;

  const returnTo = (() => {
    const q = new URLSearchParams();
    if (initialFacility) q.set("facility", initialFacility);
    if (initialDate) q.set("date", initialDate);
    const s = q.toString();
    return `/centris/reserve${s ? `?${s}` : ""}`;
  })();

  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="Request a room."
        lead="For ministry meetings, trainings and events. Rooms are free. Send a request and the facilities team will confirm it."
      />

      <Section>
        <Container>
          {signedIn ? (
            <BookingFlow
              facilities={rooms}
              initialFacility={initialFacility}
              initialDate={initialDate}
              today={today}
            />
          ) : (
            <div className="mx-auto max-w-xl border border-hairline bg-paper-bright p-8 text-center">
              <Eyebrow>Sign in</Eyebrow>
              <h2 className="mt-3 font-display text-2xl">
                Please sign in first
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[0.92rem] leading-relaxed text-ink-soft">
                We ask you to sign in so each request has a real name and email,
                and we can confirm the room with you. There&rsquo;s no password.
                We email you a link to sign in.
              </p>
              <div className="mt-6">
                <ButtonLink
                  href={`/sign-in?next=${encodeURIComponent(returnTo)}`}
                  size="lg"
                >
                  Sign in to continue
                </ButtonLink>
              </div>
            </div>
          )}
        </Container>
      </Section>

      <Section id="policies" tone="deep" className="scroll-mt-24">
        <Container>
          <SectionHead
            eyebrow="Policies"
            title="Room policies"
            lead="A few things that help every ministry share the rooms well."
          />
          <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
            {POLICIES.map(([t, b]) => (
              <li key={t} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <span className="font-semibold text-ink">{t}</span>
                <span className="leading-relaxed text-ink-soft">{b}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}

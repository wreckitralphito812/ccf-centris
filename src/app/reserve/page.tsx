import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { IconLine, StatusBadge } from "@/components/booking";
import type { UiIconName } from "@/components/icons";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { whenLabel } from "@/lib/booking-status";
import { MAX_GROUP_SIZE } from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { getMyUpcoming } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Reserve",
  description:
    "Book a table for your Dgroup or request a room for a ministry gathering at CCF Centris.",
};

/** Signed-in members see their next booking, so render per visitor. */
export const dynamic = "force-dynamic";

/**
 * What can be booked, as calm cards (Calendly's event types, 2026-09-30):
 * when it's open, three quick facts, and one button each. A member's next
 * booking sits on top, so this page is also the way back to what they've
 * booked.
 */
const OPTIONS: {
  title: string;
  badge: string;
  href: string;
  cta: string;
  facts: [UiIconName, string][];
}[] = [
  {
    title: "Dgroup table",
    badge: "Mon–Fri",
    href: "/reserve/dgroup",
    cta: "Book a table",
    facts: [
      ["clock", "2½ hours, from 1, 4 or 7 PM"],
      ["people", `Up to ${MAX_GROUP_SIZE} people`],
      ["check", "Confirmed at once"],
    ],
  },
  {
    title: "Ministry room",
    badge: "Mon–Sat",
    href: "/centris/reserve",
    cta: "Request a room",
    facts: [
      ["clock", "Any time, 9:00 AM to 9:30 PM"],
      ["people", "Rooms for 36 to 90"],
      ["check", "The facilities team confirms"],
    ],
  },
];

export default async function ReservePage() {
  const today = manilaDateKey();
  const user = hasAccounts() ? await currentUser() : null;
  const next = user ? (await getMyUpcoming(today))[0] : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="What would you like to book?"
        lead="Use a space at CCF Centris for your Dgroup or your ministry."
      />
      <Section tone="mist">
        <Container className="max-w-5xl">
          {next ? (
            <Link
              href="/my/reservations"
              className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[1.5rem] bg-night px-7 py-6 text-paper-bright transition-colors hover:bg-ink"
            >
              <span className="min-w-0">
                <span className="block text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-paper-bright/70">
                  Your next booking
                </span>
                <span className="mt-1 block text-[1.1rem] font-semibold">
                  {next.title} · {whenLabel(next.date, today)}, {next.time.split(" – ")[0]}
                </span>
              </span>
              <span className="text-[0.98rem] font-semibold text-clay-lift">Manage</span>
            </Link>
          ) : null}

          <ul className="grid gap-6 md:grid-cols-3">
            {OPTIONS.map((o) => (
              <li key={o.title} className="calm-card flex flex-col p-8">
                <span>
                  <StatusBadge tone="ok">{o.badge}</StatusBadge>
                </span>
                <h2 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.01em] text-ink">{o.title}</h2>
                <div className="mt-4 space-y-2.5">
                  {o.facts.map(([icon, text]) => (
                    <IconLine key={text} icon={icon}>
                      {text}
                    </IconLine>
                  ))}
                </div>
                <div className="mt-auto pt-8">
                  <ButtonLink href={o.href} size="lg">
                    {o.cta}
                  </ButtonLink>
                </div>
              </li>
            ))}
            <li className="calm-card flex flex-col p-8">
              <span>
                <StatusBadge tone="grey">Soon</StatusBadge>
              </span>
              <h2 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.01em] text-ink-mute">The court</h2>
              <p className="mt-4 text-[1rem] leading-relaxed text-ink-mute">
                Basketball and pickleball bookings open after launch.
              </p>
            </li>
          </ul>

          <p className="mt-10 text-center text-[1rem] text-ink-soft">
            Already booked?{" "}
            <Link href="/my/reservations" className="font-semibold text-clay underline-offset-4 hover:underline">
              See your reservations
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}

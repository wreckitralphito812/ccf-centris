import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reserve",
  description:
    "Book a table for your Dgroup, request a room for a ministry gathering, or reserve the court at CCF Centris.",
};

const OPTIONS: { title: string; body: string; href: string | null }[] = [
  {
    title: "A table for my Dgroup",
    body: "Monday to Friday, 1:00 to 9:30 PM, in the Dgroup Lounge or Welcome Center. We assign the table.",
    href: "/reserve/dgroup",
  },
  {
    title: "A room for a ministry gathering",
    body: "John, Luke, Matthew, Mark, the Welcome Center or the Dgroup Lounge. Free for ministries, confirmed by the facilities team.",
    href: "/centris/reserve",
  },
  {
    title: "The court",
    body: "Basketball and pickleball bookings are on their way.",
    href: null,
  },
];

export default function ReservePage() {
  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="What would you like to book?"
        lead="Use a space at CCF Centris for your Dgroup, your ministry, or a game."
      />
      <Section>
        <Container className="max-w-3xl">
          <ul className="space-y-px border border-hairline bg-hairline">
            {OPTIONS.map((o) => (
              <li key={o.title}>
                {o.href ? (
                  <Link
                    href={o.href}
                    className="group flex items-center justify-between gap-6 bg-paper-bright p-6 transition-colors hover:bg-bone/50"
                  >
                    <span>
                      <span className="font-display block text-2xl leading-tight text-ink">{o.title}</span>
                      <span className="mt-1.5 block text-[0.95rem] text-ink-soft">{o.body}</span>
                    </span>
                    <span aria-hidden className="label shrink-0 text-clay transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-6 bg-paper-bright p-6">
                    <span>
                      <span className="font-display block text-2xl leading-tight text-ink-mute">{o.title}</span>
                      <span className="mt-1.5 block text-[0.95rem] text-ink-mute">{o.body}</span>
                    </span>
                    <span className="label shrink-0 text-ink-mute">Soon</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[0.95rem] text-ink-soft">
            Already booked?{" "}
            <Link href="/my/reservations" className="text-clay underline underline-offset-4">
              See and manage your reservations
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}

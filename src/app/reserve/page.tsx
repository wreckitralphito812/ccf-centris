import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reserve",
  description:
    "Book a table for your Dgroup or request a room for a ministry gathering at CCF Centris.",
};

/**
 * The two things you can book, side by side, each with the few facts that
 * decide which one you want: who it's for, what it costs, and how it's
 * confirmed. Courts aren't bookable yet, so they get a line, not a card.
 */
const OPTIONS: {
  eyebrow: string;
  title: string;
  body: string;
  facts: [string, string][];
  href: string;
  cta: string;
}[] = [
  {
    eyebrow: "Dgroups",
    title: "Book a Dgroup table",
    body: "A table in the Dgroup Lounge or the Welcome Center for your weekly meeting.",
    facts: [
      ["When", "Monday to Friday, 1:00, 4:00 or 7:00 PM"],
      ["Group size", "Up to 12 people"],
      ["Confirmation", "Instant, by email"],
    ],
    href: "/reserve/dgroup",
    cta: "Book a table",
  },
  {
    eyebrow: "Ministries",
    title: "Request a room",
    body: "John, Luke, Matthew or Mark, the Welcome Center or the Dgroup Lounge, for a ministry meeting, training or event.",
    facts: [
      ["When", "Monday to Saturday, from 9:00 AM"],
      ["Cost", "Free for ministries"],
      ["Confirmation", "By email, once the facilities team approves"],
    ],
    href: "/centris/reserve",
    cta: "Request a room",
  },
];

export default function ReservePage() {
  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="Use the center."
        lead="Book a table for your Dgroup, or request a room for your ministry. You'll need to sign in with your email; there's no password."
      />
      <Section>
        <Container>
          <div className="grid gap-6 md:grid-cols-2 md:grid-rows-[repeat(5,auto)]">
            {OPTIONS.map((o) => (
              <div key={o.href} className="flex flex-col border border-hairline bg-paper-bright p-7 sm:p-9 md:row-span-5 md:grid md:grid-rows-subgrid md:gap-y-0">
                <p className="label text-clay">{o.eyebrow}</p>
                <h2 className="font-display mt-3 text-3xl leading-tight text-ink">{o.title}</h2>
                <p className="mt-3 self-start leading-relaxed text-ink-soft">{o.body}</p>
                <dl className="mt-6 self-start divide-y divide-hairline border-y border-hairline">
                  {o.facts.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3">
                      <dt className="label text-ink-mute">{k}</dt>
                      <dd className="text-right text-[0.95rem] text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ButtonLink href={o.href} size="lg" className="mt-7 self-start">
                  {o.cta}
                </ButtonLink>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[0.95rem] text-ink-mute">
            Court bookings for basketball and pickleball are coming soon.
          </p>
        </Container>
      </Section>
    </>
  );
}

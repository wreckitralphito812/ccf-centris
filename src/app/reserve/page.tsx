import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reserve",
  description:
    "Book a table for your Dgroup, request a room for a ministry gathering, or reserve the court at CCF Centris.",
};

const OPTIONS: {
  eyebrow: string;
  title: string;
  body: string;
  href: string | null;
  cta: string;
}[] = [
  {
    eyebrow: "Dgroup meeting",
    title: "Book a table for your Dgroup.",
    body: "Weeknight tables in the Dgroup Lounge and the Welcome Center. Tell us how many are coming and we'll assign a table that fits.",
    href: "/reserve/dgroup",
    cta: "Book a table",
  },
  {
    eyebrow: "Ministry & church gatherings",
    title: "Request a room.",
    body: "Free for ministry meetings, trainings, and events. Send a request, and once an admin approves it, it goes on the calendar.",
    href: "/centris/reserve",
    cta: "Request a room",
  },
  {
    eyebrow: "Sports",
    title: "Reserve the court.",
    body: "Basketball and pickleball bookings are on their way.",
    href: null,
    cta: "Coming soon",
  },
];

export default function ReservePage() {
  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="Use the center."
        lead="Book a space at CCF Centris for your Dgroup, your ministry, or a game."
      />
      <Section>
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            {OPTIONS.map((o) => (
              <div key={o.eyebrow} className="flex flex-col border border-hairline bg-paper-bright p-7">
                <p className="label text-clay">{o.eyebrow}</p>
                <h2 className="display-md mt-3 text-balance">{o.title}</h2>
                <p className="mt-4 flex-1 text-[1rem] leading-relaxed text-ink-soft">{o.body}</p>
                {o.href ? (
                  <ButtonLink href={o.href} size="lg" className="mt-6 self-start">
                    {o.cta}
                  </ButtonLink>
                ) : (
                  <span className="label mt-6 self-start border border-hairline px-5 py-3 text-ink-mute">
                    {o.cta}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

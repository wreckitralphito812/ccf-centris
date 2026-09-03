import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Families",
  description:
    "Coming to CCF Centris with children: NXTGEN age groups, check-in, safety policy, nursing and stroller access, and what your kids will actually do.",
};

export default function FamiliesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Families"
        title="Bring the kids. Really."
        lead="NXTGEN runs alongside every Sunday service with rooms built for each age. Or keep your children with you in the main hall. Both are completely normal here."
        actions={
          <>
            <ButtonLink href="/visit/service-times" size="lg">
              See service times
            </ButtonLink>
            <ButtonLink href="/communities/nxtgen" tone="outline" size="lg">
              About NXTGEN
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHead
            eyebrow="Age groups"
            title="Where your child goes"
            lead="Each room runs the same message the adults are hearing, taught for that age."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Nursery", "0 to 2 years", "Care, play, and a quiet corner. Parents are paged if needed."],
              ["Preschool", "3 to 5 years", "Songs, a short Bible story, and craft. High energy, high supervision."],
              ["Kids", "Grades 1 to 3", "Teaching, small groups, and games built around the week's passage."],
              ["Preteen", "Grades 4 to 6", "Real discussion, real questions, and their first taste of a Dgroup."],
            ].map(([t, age, b]) => (
              <div key={t} className="bg-paper-bright p-6">
                <p className="label text-clay">{age}</p>
                <h3 className="font-display mt-2 text-2xl">{t}</h3>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <Eyebrow>Safety</Eyebrow>
              <h2 className="display-md mt-5">
                How we look after your children.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                This is the part we take most seriously, and the part we will
                never cut a corner on. If you want to see a room before leaving
                your child in it, just ask. The answer is always yes.
              </p>
            </div>
            <ul className="space-y-px border border-hairline bg-hairline">
              {[
                ["Screened volunteers", "Every NXTGEN volunteer completes a background check and child safety training before their first Sunday."],
                ["Secure check-in", "You check your child in and receive a matching code. Only the person holding that code can collect them."],
                ["Two-adult rule", "No volunteer is ever alone with a child. Every room has at least two screened adults."],
                ["Allergies and needs", "Tell us at check-in. It goes on your child's tag and the room lead is briefed before the service starts."],
                ["Finding you", "If your child needs you, your number appears on the screen in the worship hall. You will not miss it."],
              ].map(([t, b]) => (
                <li key={t} className="bg-paper-bright p-6">
                  <h3 className="font-display text-lg">{t}</h3>
                  <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
                    {b}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead eyebrow="Practical" title="The small things" />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Check-in opens", "30 minutes before each service, on the same floor as the worship hall."],
              ["Nursing and changing", "A private nursing room and changing facilities are available near the NXTGEN area."],
              ["Strollers", "Lift access throughout. Stroller parking is just outside the NXTGEN rooms."],
              ["Staying together", "If your child would rather sit with you, that is fine. Nobody will ask you to move."],
              ["Late arrival", "Check-in stays open through the first songs. Come in whenever you get here."],
              ["Pickup", "Collect from the same room you checked in at, with your code. Allow a few minutes after the service."],
            ].map(([t, b]) => (
              <div key={t}>
                <h3 className="font-display text-lg">{t}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Parents need people too.</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                There are Dgroups that meet with kids in the room, and a
                families community running marriage and parenting classes
                through the year.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/communities/families"
                tone="on-dark"
              >
                Families community
              </ButtonLink>
              <ButtonLink
                href="/grow/find-a-dgroup"
                tone="ghost-on-dark"
              >
                Find a Dgroup →
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

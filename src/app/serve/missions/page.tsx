import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { getEventsForCommunity, getUpcomingEvents } from "@/lib/queries";
import { EventCard } from "@/components/cards";

export const metadata: Metadata = {
  title: "Missions",
  description:
    "Missions at CCF Centris: local outreach around Quezon City and CCF Beyond, CCF's global church-planting work across more than 40 nations.",
};

export default async function MissionsPage() {
  const events = (await getUpcomingEvents()).filter(
    (e) => e.category === "Outreach",
  );

  return (
    <>
      <PageHeader
        eyebrow="Missions"
        title="Make disciples of all nations."
        lead="CCF has planted churches since 1984 and now reaches beyond the Philippines. Centris is a sending center as much as a gathering one."
        actions={
          <>
            <ButtonLink href="#local" size="lg">
              Local outreach
            </ButtonLink>
            <ButtonLink href="/serve" tone="outline" size="lg">
              Serve at Centris
            </ButtonLink>
          </>
        }
      />

      {/* The scale, stated plainly */}
      <Section tone="ink" className="py-12">
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              ["1984", "CCF's first service, 400 people at the Asian Institute of Management in Makati."],
              ["2006", "CCF Singapore became the first overseas church plant, and CCF Beyond was established."],
              ["40+", "Nations where CCF Beyond has helped establish satellites and house churches."],
            ].map(([n, b]) => (
              <div key={n}>
                <p className="font-display text-6xl leading-none text-clay">{n}</p>
                <p className="mt-4 leading-relaxed text-paper-bright/70">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Local */}
      <Section id="local" className="scroll-mt-24">
        <Container>
          <SectionHead
            eyebrow="Close to home"
            title="Outreach around Quezon City"
            lead="The barangays around Eton Centris are the first place Centris is meant to serve. Most of this work is unglamorous and repeated."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {[
              ["Feeding programmes", "Regular meals for families in the barangays nearest the center, run with local barangay officials rather than around them."],
              ["Medical and dental missions", "Volunteer professionals running check-ups and basic treatment days, several times a year."],
              ["Kids' outreach", "Games, teaching, and a meal for children who will never come to a Sunday service on their own."],
              ["Livelihood and skills", "Practical training for adults, because a meal helps for a day and a skill helps for longer."],
              ["Disaster response", "The Philippines gets typhoons. The center's halls become staging space when they do."],
              ["House churches", "Small gatherings meeting in homes across Quezon City, the model CCF has used since the beginning."],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-7">
                <h3 className="font-display text-xl">{t}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* CCF Beyond */}
      <Section tone="deep">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow>CCF Beyond</Eyebrow>
              <h2 className="display-md mt-5">
                Filipinos are already everywhere.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                CCF Beyond began in 2006 as a response to the call for
                international expansion. Its premise is simple: millions of
                Filipinos work overseas, and each one is already where a
                missionary would have to be sent.
              </p>
              <p className="mt-4 leading-relaxed text-ink-soft">
                Since then CCF Beyond has helped create satellites and house
                churches in more than 40 nations. Someone discipled at Centris
                who takes a job abroad is not leaving the mission. They are
                joining a different part of it.
              </p>
              <ButtonLink
                href="https://www.ccf.org.ph"
                tone="outline"
                className="mt-7"
              >
                CCF worldwide
              </ButtonLink>
            </div>

            <ul className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {[
                ["Going overseas for work?", "Tell the missions team before you leave. There may already be a CCF satellite or house church where you are going."],
                ["Support a worker", "Centris members support missionaries and church planters financially and in prayer, by name rather than in the abstract."],
                ["Short-term teams", "Trips run through the year, usually a week, often building or teaching. No special skills required."],
                ["Start a house church", "The model that built CCF. If you are somewhere without one, the missions team will train you."],
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

      {/* Outreach events */}
      {events.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="Coming up"
              title="Outreach you can join"
              action={
                <ButtonLink href="/events?category=Outreach" tone="outline">
                  All outreach
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section tone="bright">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Start where you are.</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
                Most people who end up on a mission field started by serving a
                Saturday outreach in their own city. It is the same work at a
                different distance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/serve">Find a ministry</ButtonLink>
              <ButtonLink href="/contact" tone="outline">
                Talk to the missions team
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

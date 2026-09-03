import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { VolunteerCard } from "@/components/cards";
import { getVolunteerRoles } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Serve",
  description:
    "Volunteer at CCF Centris. Welcome team, NXTGEN, worship, production, sports, prayer, and more. Try one for a month with no obligation.",
};

export default async function ServePage() {
  const roles = await getVolunteerRoles();

  // Group by ministry so the list reads as teams rather than a wall of cards.
  const byMinistry = new Map<string, typeof roles>();
  for (const r of roles) {
    const k = r.ministry ?? "Other";
    byMinistry.set(k, [...(byMinistry.get(k) ?? []), r]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Serve"
        title={
          <>
            There&rsquo;s a place for you to <span className="italic text-clay">serve</span>.
          </>
        }
        lead="Every Sunday at Centris runs on volunteers. Most people start by trying one team for a month, with no expectation beyond that."
        actions={
          <>
            <ButtonLink href="#roles" size="lg">
              See open roles
            </ButtonLink>
            <ButtonLink href="/serve/at-centris" tone="outline" size="lg">
              Teams at Centris
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHead
            eyebrow="How it works"
            title="Nobody signs up for life"
            lead="Serving here is deliberately low-commitment to start. You can stop, swap teams, or take a season off, and nobody will think less of you."
          />
          <ol className="mt-10 space-y-px border border-hairline bg-hairline">
            {[
              ["Pick something that fits", "Look at the commitment on each role rather than the title. Two Sundays a month is the most common pattern."],
              ["Apply, then talk", "Someone from that team gets in touch. It is a conversation, not an interview, unless the role involves children or pastoral care."],
              ["Training first", "Every role has some. Child-facing and prayer roles require a background check and formal training before a first shift."],
              ["Try it for a month", "Serve alongside someone experienced. If it is not for you, say so and we will help you find something that is."],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-6 bg-paper-bright p-7">
                <span className="font-display shrink-0 text-4xl leading-none text-clay/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-xl">{t}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section id="roles" tone="deep" className="scroll-mt-24">
        <Container>
          <SectionHead
            eyebrow="Open roles"
            title="Teams at CCF Centris"
            lead={`${roles.length} roles across ${byMinistry.size} teams.`}
          />

          <div className="mt-10 space-y-12">
            {[...byMinistry.entries()].map(([ministry, list]) => (
              <div key={ministry}>
                <h3 className="font-display text-2xl">{ministry}</h3>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => (
                    <VolunteerCard key={r.id} r={r} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Eyebrow>Safeguarding</Eyebrow>
              <h2 className="display-md mt-5">
                The checks we don&rsquo;t skip.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Anything involving children, young people, or pastoral
                confidence has requirements that are not negotiable, however
                short-staffed a Sunday is.
              </p>
            </div>
            <ul className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {[
                ["Background checks", "Required for every NXTGEN and Elevate role before a first shift."],
                ["Child safety training", "A full session, not a form. Renewed regularly."],
                ["Two-adult rule", "No volunteer is ever alone with a child, in any room, at any time."],
                ["Confidentiality", "Prayer and pastoral volunteers are interviewed and bound to confidentiality."],
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

      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Not sure where you&rsquo;d fit?</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                Come to a serve team orientation. One evening, no commitment,
                and you will see what each team actually does before deciding.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/events/serve-team-orientation"
                tone="on-dark"
              >
                Serve team orientation
              </ButtonLink>
              <ButtonLink
                href="/contact"
                tone="ghost-on-dark"
              >
                Ask someone →
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

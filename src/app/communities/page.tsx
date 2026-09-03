import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section, SectionHead } from "@/components/ui";
import { CommunityCard } from "@/components/cards";
import { getCommunities } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Communities",
  description:
    "CCF communities at Centris: NXTGEN, Elevate, B1G, Across, Women 2 Women, Movement, Ignite, and Sports Ministry.",
};

export default async function CommunitiesPage() {
  const communities = await getCommunities();

  return (
    <>
      <PageHeader
        eyebrow="Communities"
        title="Find the people in your season."
        lead="CCF organises its ministries around life stages, so whatever you are in the middle of, there are others at Centris in the middle of it too."
        actions={
          <>
            <ButtonLink href="/grow/find-a-dgroup" size="lg">
              Find a Dgroup
            </ButtonLink>
            <ButtonLink href="/events" tone="outline" size="lg">
              What&rsquo;s on
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {communities.map((c) => (
              <CommunityCard key={c.id} c={c} />
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <SectionHead
            eyebrow="How they fit together"
            title="Communities gather. Dgroups grow."
            lead="A community is where you meet people in the same season. A Dgroup is the handful of them you actually grow with. Most people end up in both."
            action={
              <ButtonLink href="/grow/join-a-dgroup" tone="outline">
                How Dgroups work
              </ButtonLink>
            }
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
            {[
              [
                "Come to a gathering",
                "Every community meets regularly at Centris. Turn up without telling anyone, sit at the back, and see what you make of it.",
              ],
              [
                "Join a Dgroup",
                "Most communities run their own Dgroups, so you can find a small group of people in the same life stage as you.",
              ],
              [
                "Serve alongside them",
                "Communities are also where most people find a place to serve, usually by helping with the thing they already turn up to.",
              ],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-7">
                <h3 className="font-display text-xl">{t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                  {b}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { CONNECT_LINKS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Join a Dgroup",
  description:
    "What a Dgroup is, what happens at one, and how to join one at CCF Centris.",
};

export default function JoinDgroupPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dgroups"
        title={
"Join a Dgroup."
        }
        lead="A Dgroup is a small group that meets every week to read the Bible and pray together. It's how CCF makes disciples."
        actions={
          <>
            <ButtonLink href={CONNECT_LINKS.dgroupSignup} target="_blank" rel="noreferrer" size="lg">
              Sign up for a Dgroup
            </ButtonLink>
            <ButtonLink href="/watch/4ws" tone="outline" size="lg">
              See the 4Ws
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHead
            eyebrow="What happens"
            title="What happens at a Dgroup"
            lead="Most groups follow the same four parts, which CCF calls the 4Ws."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Welcome", "An opening question that gets everyone talking before anything heavy. Often over food."],
              ["Worship", "Reading the passage together and praying. Some groups sing, many do not."],
              ["Word", "Going through Sunday's passage and how it applies to your week."],
              ["Works", "One thing each person will do before the group meets again."],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-7">
                <p className="font-display text-4xl leading-none text-clay/25">{t}</p>
                <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow>Common worries</Eyebrow>
              <h2 className="display-md mt-5">
                Questions people ask before their first Dgroup.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Nearly everyone is a bit nervous the first time.
              </p>
            </div>
            <dl className="divide-y divide-hairline border-y border-hairline">
              {[
                ["Do I have to pray out loud?", "No. Plenty of people stay quiet for months, and nobody will put you on the spot."],
                ["What if I don't know the Bible?", "That's fine. Groups explain as they go."],
                ["Do I have to share personal things?", "Only what you want to. Most people open up slowly, over months."],
                ["What if I can't come every week?", "Come when you can. Everyone misses a week now and then because of work or family."],
                ["Is it a commitment?", "Try it for a few weeks before you decide. There's no fee."],
              ].map(([q, a]) => (
                <div key={q} className="py-5">
                  <dt className="font-display text-lg">{q}</dt>
                  <dd className="mt-1.5 leading-relaxed text-ink-soft">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead eyebrow="Joining" title="How it works from here" />
          <ol className="mt-10 space-y-px border border-hairline bg-hairline">
            {[
              ["Fill in the sign-up form", "CCF's Dgroup form asks a few questions about you and when you're free."],
              ["The Dgroup team gets in touch", "They'll answer your questions and match you with a group."],
              ["Go along and see", "Try it for a few weeks. If it's not the right fit, the team can help you find another one."],
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

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={CONNECT_LINKS.dgroupSignup} target="_blank" rel="noreferrer" size="lg">
              Sign up for a Dgroup
            </ButtonLink>
            <ButtonLink href="/contact" tone="outline" size="lg">
              Ask us a question
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Leading a Dgroup</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                Already in a Dgroup and thinking about leading one? Talk to
                us.
              </p>
            </div>
            <ButtonLink
              href="/contact"
              tone="on-dark"
            >
              Ask about leading
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}

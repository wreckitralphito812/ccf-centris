import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { findDgroups } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Join a Dgroup",
  description:
    "What a Dgroup is, what happens at one, and how to join at CCF Centris. Discipleship groups are the centre of how CCF grows people.",
};

export default async function JoinDgroupPage() {
  const groups = await findDgroups({});

  return (
    <>
      <PageHeader
        eyebrow="Dgroups"
        title={
          <>
            Life is better <span className="italic text-clay">together</span>.
          </>
        }
        lead="A Dgroup is a small group of people who meet weekly to open the Bible, pray, and stay in each other's lives. It is the centre of how CCF makes disciples, not an add-on to Sunday."
        actions={
          <>
            <ButtonLink href="/grow/find-a-dgroup" size="lg">
              Find a Dgroup
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
            eyebrow="What actually happens"
            title="Ninety minutes, once a week"
            lead="Most groups follow the same four movements. CCF calls them the 4Ws."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Welcome", "An opening question that gets everyone talking before anything heavy. Often over food."],
              ["Worship", "Reading the passage together and praying. Some groups sing, many do not."],
              ["Word", "Working through what Sunday's passage actually says, and where it presses on real life."],
              ["Works", "One concrete step each person takes before the group meets again. Someone checks in midweek."],
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
                The things people are too polite to ask.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Nearly everyone is nervous before their first Dgroup. These are
                the questions we hear most.
              </p>
            </div>
            <dl className="divide-y divide-hairline border-y border-hairline">
              {[
                ["Do I have to pray out loud?", "No. Plenty of people sit quietly for months. Nobody will put you on the spot."],
                ["What if I don't know the Bible?", "That is normal and completely fine. Groups are used to explaining as they go, and there is a group specifically for people new to faith."],
                ["Do I have to share personal things?", "Only what you choose to. Trust builds over months, not in week one."],
                ["What if I can't come every week?", "Come when you can. Shift work and family life are ordinary realities, not failures."],
                ["Is it a commitment?", "Try a few weeks before deciding anything. There is no sign-up, no fee, and no obligation."],
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
              ["Find a group that fits", `There are ${groups.length} groups meeting around Centris across every day of the week. Filter by day, life stage, and whether you want in person or online.`],
              ["Send a note", "Say you are interested. Your details go to the Dgroup team, never straight to a leader."],
              ["Someone talks to you first", "A member of the team replies within a few days, answers your questions, and introduces you. You are never added to a group cold."],
              ["Go along and see", "Try it for a few weeks. If it is not the right fit, we will help you find another one. That happens often and nobody minds."],
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
            <ButtonLink href="/grow/find-a-dgroup" size="lg">
              Find a Dgroup
            </ButtonLink>
            <ButtonLink href="/contact" tone="outline" size="lg">
              Ask someone to help me choose
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Ready to lead one?</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                Every group starts because someone decided to open their home.
                New leaders train alongside an experienced one for their
                first year.
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

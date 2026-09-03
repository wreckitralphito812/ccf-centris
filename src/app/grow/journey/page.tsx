import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Discipleship journey",
  description:
    "The path CCF has followed since 1984: know Jesus, join a Dgroup, grow, learn through GLC, serve, lead, and make disciples.",
};

const STAGES = [
  {
    n: "01",
    t: "Know Jesus",
    b: "Everything starts here. Not with joining anything, but with understanding who Jesus is and deciding what you make of him.",
    href: "/know-jesus",
    cta: "Where it starts",
  },
  {
    n: "02",
    t: "Join a Dgroup",
    b: "A handful of people who meet weekly, open the Bible, and stay in each other's lives. This is where most growth actually happens.",
    href: "/grow/find-a-dgroup",
    cta: "Find a Dgroup",
  },
  {
    n: "03",
    t: "Grow",
    b: "Week by week, through Sunday teaching, the 4Ws in your group, and the ordinary habits of prayer and Scripture.",
    href: "/watch/messages",
    cta: "Browse messages",
  },
  {
    n: "04",
    t: "Learn through GLC",
    b: "Growing Life Classes take you deeper than a Sunday can, from the foundations of faith through to leading others.",
    href: "/grow/glc",
    cta: "See GLC classes",
  },
  {
    n: "05",
    t: "Serve",
    b: "Use what you have been given. Most people find their place by trying one team for a month with no expectation beyond that.",
    href: "/serve",
    cta: "Find a ministry",
  },
  {
    n: "06",
    t: "Lead",
    b: "Open your home, take a group, or lead a team. You will be trained and paired with someone experienced for your first year.",
    href: "/grow/glc",
    cta: "Leader training",
  },
  {
    n: "07",
    t: "Make disciples",
    b: "The point of all of it. You disciple someone, they disciple someone else, and it keeps going. This is CCF's whole reason for existing.",
    href: "/serve/missions",
    cta: "Missions",
  },
];

export default function JourneyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Discipleship journey"
        title="Make disciples who make disciples."
        lead="CCF has followed the same path since 1984. It is not a programme you graduate from, and it rarely runs in a straight line. Most people move back and forth across it for years."
        actions={
          <>
            <ButtonLink href="/grow/find-a-dgroup" size="lg">
              Start with a Dgroup
            </ButtonLink>
            <ButtonLink href="/know-jesus" tone="outline" size="lg">
              I want to know Jesus
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <ol className="relative">
            {/* Spine, hidden on small screens where the cards stack. */}
            <div
              aria-hidden
              className="absolute left-[3.25rem] top-4 hidden h-[calc(100%-2rem)] w-px bg-hairline lg:block"
            />
            {STAGES.map((s) => (
              <li key={s.n} className="relative">
                <div className="grid gap-6 py-8 lg:grid-cols-[6.5rem_1fr_auto] lg:items-start lg:gap-10">
                  <div className="relative">
                    <span className="font-display relative z-10 block bg-paper pb-2 text-5xl leading-none text-clay/30 lg:pr-4">
                      {s.n}
                    </span>
                  </div>
                  <div className="max-w-2xl">
                    <h2 className="font-display text-3xl leading-tight">{s.t}</h2>
                    <p className="mt-3 leading-relaxed text-ink-soft">{s.b}</p>
                  </div>
                  <Link
                    href={s.href}
                    className="label shrink-0 self-start border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                  >
                    {s.cta} →
                  </Link>
                </div>
                <div className="border-b border-hairline" />
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>A note on this</Eyebrow>
              <h2 className="display-md mt-5">
                Growth is not a scoreboard.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                You will not find points, streaks, levels, or leaderboards
                anywhere on this site. Spiritual growth is slow, uneven, and
                often invisible, and turning it into a game would misrepresent
                what it actually is.
              </p>
              <p className="mt-4 leading-relaxed text-ink-soft">
                Nobody is measuring you against anyone else. The stages above
                are a description of how people tend to grow, not a checklist
                to complete.
              </p>
            </div>
            <div className="flex flex-col justify-center border border-hairline bg-paper-bright p-8">
              <p className="font-script text-4xl leading-tight text-ink-soft">
                come as you are, but don&rsquo;t stay as you are
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/grow/find-a-dgroup">Find a Dgroup</ButtonLink>
                <ButtonLink href="/care/talk" tone="outline">
                  Talk to someone
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

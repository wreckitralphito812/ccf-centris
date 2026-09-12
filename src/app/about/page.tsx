import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import {
  CORE_VALUES,
  FAITH_NOTE,
  IDENTITY,
  MISSION,
  MISSION_VERSE,
  POSITION_STATEMENTS_URL,
  STATEMENT_OF_FAITH,
  VISION,
} from "@/data/beliefs";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Who we are",
  description:
    "CCF Centris is a satellite of Christ's Commission Fellowship. Our mission, vision, core values, and statement of faith.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Who we are"
        title="A movement, not a building."
        lead={IDENTITY}
        tone="ink"
        actions={
          <>
            <ButtonLink
              href="/visit/new-here"
              size="lg"
                tone="on-dark"
            >
              Plan your visit
            </ButtonLink>
            <ButtonLink
              href="/grow/find-a-dgroup"
              tone="ghost-on-dark"
              size="lg"
            >
              Find a Dgroup →
            </ButtonLink>
          </>
        }
      />

      {/* Mission */}
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <Eyebrow>Our mission</Eyebrow>
              <p className="display-md mt-5 text-balance">{MISSION}</p>
              <blockquote className="mt-8 border-l-2 border-clay pl-6">
                <p className="text-[1.02rem] italic leading-relaxed text-ink-soft">
                  &ldquo;{MISSION_VERSE.text}&rdquo;
                </p>
                <cite className="label mt-3 block not-italic text-clay">
                  {MISSION_VERSE.ref}
                </cite>
              </blockquote>
            </div>
            <div className="border border-hairline bg-paper-bright p-8">
              <Eyebrow>Our vision</Eyebrow>
              <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-soft">
                {VISION}
              </p>
              <p className="font-display font-light tracking-wide mt-8 text-3xl text-ink-soft">
                small groups, transformed lives
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Core values */}
      <Section tone="deep">
        <Container>
          <SectionHead
            eyebrow="Our core values"
            title="LOVE"
            lead="Part of what unites CCF is a common set of values that guide our priorities in our walk with God."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {CORE_VALUES.map((v) => (
              <div key={v.letter} className="bg-paper-bright p-7">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-6xl leading-none text-clay">
                    {v.letter}
                  </span>
                  <h3 className="font-display text-2xl leading-tight">
                    {v.title}
                  </h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {v.points.map((p) => (
                    <li
                      key={p}
                      className="flex gap-3 text-[0.9rem] leading-relaxed text-ink-soft"
                    >
                      <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-clay" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Statement of faith */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="Statement of faith"
            title="What CCF believes"
            lead="Published by CCF and quoted here in full."
          />
          <dl className="mt-10 divide-y divide-hairline border-y border-hairline">
            {STATEMENT_OF_FAITH.map((b) => (
              <div key={b.q} className="grid gap-3 py-6 lg:grid-cols-[20rem_1fr] lg:gap-10">
                <dt className="font-display text-xl leading-snug">{b.q}</dt>
                <dd className="leading-relaxed text-ink-soft">{b.a}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 max-w-3xl border-l-2 border-clay bg-paper-bright py-5 pl-6 pr-5">
            <p className="text-[0.95rem] leading-relaxed text-ink-soft">
              {FAITH_NOTE}
            </p>
          </div>

          <p className="mt-8 max-w-2xl leading-relaxed text-ink-soft">
            CCF also publishes positions on marriage, gender, and the value of
            human life. Those are read in CCF&rsquo;s own words rather than
            summarised here.
          </p>
          <a
            href={POSITION_STATEMENTS_URL}
            target="_blank"
            rel="noreferrer"
            className="label mt-4 tap border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Read CCF&rsquo;s full position
          </a>
        </Container>
      </Section>

      {/* Centris */}
      <Section tone="bright">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Eyebrow>This center</Eyebrow>
              <h2 className="display-md mt-5">CCF Centris</h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                CCF Centris is a satellite center of Christ&rsquo;s Commission
                Fellowship, opened in August 2026 alongside CCF&rsquo;s 42nd
                anniversary. It is part of a movement that began in 1984 with
                400 people at the Asian Institute of Management in Makati.
              </p>
              <p className="mt-4 leading-relaxed text-ink-soft">
                Everything here belongs to that larger mission. The worship
                hall, the sports hall, the classrooms, and the lounge exist to
                make Christ-committed followers who will make Christ-committed
                followers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/centris">Explore the center</ButtonLink>
                <ButtonLink href="/grow/journey" tone="outline">
                  The discipleship journey
                </ButtonLink>
              </div>
            </div>
            <div className="border border-hairline bg-paper p-8">
              <Eyebrow>Find us</Eyebrow>
              <address className="font-display mt-5 text-2xl not-italic leading-snug">
                {SITE.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
              <ButtonLink href="/visit/directions" tone="outline" className="mt-6">
                Directions
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section, SectionHead } from "@/components/ui";
import { findDgroups, getGlcPrograms } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Grow",
  description:
    "Grow at CCF Centris: join a Dgroup, follow the discipleship journey, take a GLC class, and find resources.",
};

export default async function GrowPage() {
  const [dgroups, programs] = await Promise.all([findDgroups({}), getGlcPrograms()]);

  return (
    <>
      <PageHeader
        eyebrow="Grow"
        title={
          <>
            Nobody grows <span className="italic text-clay">alone</span>.
          </>
        }
        lead="CCF is built around Dgroups: small groups of people who meet weekly, open the Bible together, and stay in each other's lives. Everything else supports that."
        actions={
          <>
            <ButtonLink href="/grow/find-a-dgroup" size="lg">
              Find a Dgroup
            </ButtonLink>
            <ButtonLink href="/grow/journey" tone="outline" size="lg">
              See the journey
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {[
              {
                t: "Join a Dgroup",
                b: `What a Dgroup actually is, what happens at one, and how to start. ${dgroups.length} groups meeting around Centris.`,
                href: "/grow/join-a-dgroup",
              },
              {
                t: "Find a Dgroup",
                b: "Filter by day, life stage, language, and whether you want to meet in person or online.",
                href: "/grow/find-a-dgroup",
              },
              {
                t: "Discipleship journey",
                b: "From knowing Jesus to making disciples. The path CCF has followed since 1984.",
                href: "/grow/journey",
              },
              {
                t: "GLC",
                b: `Growing Life Classes take you deeper than a Sunday can. ${programs.length} programs, running each term.`,
                href: "/grow/glc",
              },
              {
                t: "Resources",
                b: "Reading plans, Dgroup templates, devotions, and guides you can use this week.",
                href: "/grow/resources",
              },
              {
                t: "Know Jesus",
                b: "If you are not sure where you stand with God, start here. No pressure, no script.",
                href: "/know-jesus",
              },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group flex flex-col bg-paper-bright p-8 transition-colors hover:bg-bone"
              >
                <h2 className="font-display text-3xl leading-tight transition-colors group-hover:text-clay">
                  {c.t}
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{c.b}</p>
                <span className="label mt-6 text-clay">Open →</span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <SectionHead
            tone="paper"
            eyebrow="GLC"
            title="Classes running this term"
            action={
              <ButtonLink
                href="/grow/glc"
                tone="on-dark"
              >
                All GLC classes
              </ButtonLink>
            }
          />
          <div className="mt-10 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((p) => (
              <div key={p.id} className="bg-night p-6">
                <p className="label text-clay">{p.code}</p>
                <h3 className="font-display mt-2 text-2xl">{p.title}</h3>
                <p className="mt-3 text-[0.88rem] leading-relaxed text-paper-bright/65">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import {
  getGlcCatalogueGroups,
  getGlcClasses,
  getGlcPrograms,
  getSyncMeta,
} from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { SyncedNote } from "@/components/synced-note";

/** The library catalogue is synced from glc.ccf.org.ph each content-sync run. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "GLC",
  description:
    "Growing Life Classes at CCF Centris. Four levels from the foundations of faith through to leading a Dgroup and making disciples.",
};

export default async function GlcPage() {
  const [programs, classes, libraryGroups, sync] = await Promise.all([
    getGlcPrograms(),
    getGlcClasses(),
    getGlcCatalogueGroups(),
    getSyncMeta("glcClasses"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="GLC"
        title="Growing Life Classes."
        lead="Four levels that take you from the foundations of faith through to leading others. Each runs six to eight weeks, in a room with people asking the same questions."
        actions={
          <ButtonLink href="#classes" size="lg">
            See classes running now
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          <SectionHead eyebrow="The four levels" title="Where each one takes you" />
          <ol className="mt-10 space-y-px border border-hairline bg-hairline">
            {programs.map((p) => (
              <li key={p.id} className="flex flex-wrap gap-6 bg-paper-bright p-7">
                <span className="font-display shrink-0 text-4xl leading-none text-clay/30">
                  {p.code}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl">{p.title}</h2>
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
                    {p.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section id="classes" tone="deep" className="scroll-mt-24">
        <Container>
          <SectionHead
            eyebrow="This term"
            title="Classes at Centris"
            lead="Registration opens a few weeks before each class starts."
            action={
              <ButtonLink href="/grow/journey" tone="outline">
                The discipleship journey
              </ButtonLink>
            }
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {classes.map((c) => {
              const full = c.capacity !== null && c.seats_taken >= c.capacity;
              const left = c.capacity === null ? null : c.capacity - c.seats_taken;
              return (
                <div
                  key={c.id}
                  className="flex flex-col border border-hairline bg-paper-bright p-7"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="clay">{c.program.code}</Pill>
                    {full ? (
                      <Pill tone="muted">Full, join the waitlist</Pill>
                    ) : left !== null ? (
                      <Pill tone="moss">{left} seats left</Pill>
                    ) : null}
                  </div>

                  <h3 className="font-display mt-3 text-2xl leading-tight">
                    {c.program.title}
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                    {c.program.description}
                  </p>

                  <dl className="mt-5 space-y-1.5 text-[0.88rem]">
                    <div className="flex gap-3">
                      <dt className="w-20 shrink-0 text-ink-mute">Schedule</dt>
                      <dd>{c.schedule_note}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-20 shrink-0 text-ink-mute">Starts</dt>
                      <dd>{fmtDate(c.starts_on)}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-20 shrink-0 text-ink-mute">Room</dt>
                      <dd>{c.venue_name ?? "To be confirmed"}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto pt-6">
                    <ButtonLink
                      href="/contact"
                      tone={full ? "outline" : "primary"}
                      full
                    >
                      {full ? "Join the waitlist" : "Register"}
                    </ButtonLink>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              ["Do I need to start at GLC 1?", "If you are new to faith or new to CCF, yes. It gives everything after it a foundation."],
              ["Is there a cost?", "Materials are provided. Any cost is listed on the class itself, and nobody is turned away over money."],
              ["What if I miss a week?", "Come to the next one. Leaders will catch you up, and most classes run again next term."],
            ].map(([q, a]) => (
              <div key={q}>
                <h3 className="font-display text-lg">{q}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">{a}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {libraryGroups.length > 0 ? (
        <Section id="library" tone="deep" className="scroll-mt-24">
          <Container>
            <SectionHead
              eyebrow="The full catalogue"
              title="GLC Library"
              lead="Every GLC training track, straight from glc.ccf.org.ph. Take any of these face-to-face, over Zoom, through e-learning, or in your Dgroup."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {libraryGroups.map((group) => (
                <div
                  key={group.category}
                  className="flex flex-col border border-hairline bg-paper-bright p-6"
                >
                  <h3 className="font-display text-xl leading-tight">
                    {group.category}
                  </h3>
                  <ul className="mt-3 space-y-2 text-[0.9rem]">
                    {group.classes.map((cls) => (
                      <li key={cls.trackKey}>
                        <a
                          href={cls.source.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
                        >
                          {cls.title} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="label mt-4 text-ink-mute">On glc.ccf.org.ph</p>
                </div>
              ))}
            </div>
            <SyncedNote lastRunAt={sync.lastRunAt} source="glc.ccf.org.ph" />
          </Container>
        </Section>
      ) : null}
    </>
  );
}

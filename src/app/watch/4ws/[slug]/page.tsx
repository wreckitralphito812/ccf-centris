import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ButtonLink, Container, Pill, Section } from "@/components/ui";
import {
  getCurrentFourWs,
  getFourWsGuide,
  getFourWsWeeks,
} from "@/lib/queries";
import { SectionNav } from "./section-nav";

/** Synced from the CCF 4Ws pages every content-sync run. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const weeks = await getFourWsWeeks();
  return weeks.filter((w) => w.hasGuide).map((w) => ({ slug: w.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getFourWsGuide(slug);
  return {
    title: guide ? `4Ws — ${guide.title}` : "4Ws guide",
    description: guide
      ? `The 4Ws discussion guide for "${guide.title}"${
          guide.dateLabel ? `, ${guide.dateLabel}` : ""
        }.`
      : undefined,
  };
}

export default async function FourWsGuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const [guide, week] = await Promise.all([
    getFourWsGuide(slug),
    getCurrentFourWs().then(async (cur) =>
      cur?.slug === slug
        ? cur
        : (await getFourWsWeeks()).find((w) => w.slug === slug) ?? null,
    ),
  ]);

  if (!guide) notFound();

  const nav = [
    guide.welcome && { id: "welcome", label: "Welcome" },
    guide.worshipSongs.length && { id: "worship", label: "Worship" },
    guide.word && { id: "word", label: "Word" },
    guide.works && { id: "works", label: "Works" },
    guide.prayCareShare && { id: "pray-care-share", label: "Pray · Care · Share" },
    guide.prayerPoints.length && { id: "prayer-points", label: "Prayer Points" },
    guide.memoryVerseReference && { id: "memory-verse", label: "Memory Verse" },
  ].filter((x): x is { id: string; label: string } => Boolean(x));

  const step = (n: number) => (
    <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-clay/10 text-sm font-semibold text-clay">
      {n}
    </span>
  );

  return (
    <>
      <PageHeader
        eyebrow="4Ws · Dgroup guide"
        title={guide.title}
        lead={
          week?.seriesTitle
            ? `From the series "${week.seriesTitle}".`
            : undefined
        }
        actions={
          <ButtonLink href="/grow/find-a-dgroup" size="lg">
            Do this in a Dgroup
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          <Breadcrumbs
            className="mb-8"
            items={[
              { label: "Watch", href: "/watch" },
              { label: "4Ws Guides", href: "/watch/4ws" },
              { label: guide.title },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2.5">
            {week?.weekNumber ? (
              <Pill tone="clay">Week {week.weekNumber}</Pill>
            ) : null}
            {week?.dateSpan ?? guide.dateLabel ? (
              <span className="label text-ink-mute">
                {week?.dateSpan ?? guide.dateLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,42rem)] lg:gap-14">
            <SectionNav items={nav} />

            <div className="space-y-6">
              {/* Welcome */}
              {guide.welcome ? (
                <section
                  id="welcome"
                  className="scroll-mt-24 rounded-xl border border-hairline bg-paper-bright p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    {step(1)}
                    <h2 className="font-display text-2xl">Welcome</h2>
                  </div>
                  <p className="font-display mt-5 text-xl leading-snug text-ink sm:text-2xl">
                    &ldquo;{guide.welcome}&rdquo;
                  </p>
                  <p className="mt-3 text-[0.85rem] text-ink-mute">
                    Give everyone a turn to answer before moving on.
                  </p>
                </section>
              ) : null}

              {/* Worship */}
              {guide.worshipSongs.length ? (
                <section
                  id="worship"
                  className="scroll-mt-24 rounded-xl border border-hairline bg-paper-bright p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    {step(2)}
                    <h2 className="font-display text-2xl">Worship</h2>
                  </div>
                  <p className="mt-4 text-[0.9rem] text-ink-soft">
                    Sing together, then read the passage and pray before the
                    discussion.
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {guide.worshipSongs.map((song) => (
                      <li
                        key={song}
                        className="rounded-full border border-hairline bg-paper px-3 py-1.5 text-[0.85rem] text-ink-soft"
                      >
                        {song}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Word */}
              {guide.word ? (
                <section
                  id="word"
                  className="scroll-mt-24 rounded-xl border border-hairline bg-paper-bright p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    {step(3)}
                    <h2 className="font-display text-2xl">Word</h2>
                  </div>

                  {guide.word.passageRef ? (
                    <div className="mt-5 border-l-2 border-clay bg-clay/5 py-3 pl-4">
                      <p className="label text-clay">
                        {guide.word.passageRef}
                        {guide.word.readNote ? ` · ${guide.word.readNote}` : ""}
                      </p>
                      {guide.word.passageText ? (
                        <p className="font-display mt-1.5 text-lg leading-snug text-ink">
                          {guide.word.passageText}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {guide.word.pointItOut.length ? (
                    <div className="mt-6">
                      <p className="label text-ink-mute">Point it out</p>
                      <ol className="mt-3 space-y-3">
                        {guide.word.pointItOut.map((p, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="font-display mt-0.5 text-sm text-clay/60 tabular">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0">
                              <span className="text-[0.95rem] font-semibold text-ink">
                                {p.heading}
                              </span>
                              {p.refs ? (
                                <span className="block text-[0.82rem] text-ink-mute">
                                  {p.refs}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {guide.word.paraphrase ? (
                    <div className="mt-6">
                      <p className="label text-ink-mute">Paraphrase it</p>
                      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                        {guide.word.paraphrase}
                      </p>
                    </div>
                  ) : null}

                  {guide.word.talkAbout.length ? (
                    <div className="mt-6">
                      <p className="label text-ink-mute">Talk about it</p>
                      <ul className="mt-3 space-y-2.5">
                        {guide.word.talkAbout.map((q, i) => (
                          <li
                            key={i}
                            className="flex gap-3 border-t border-hairline pt-2.5 text-[0.95rem] leading-relaxed text-ink-soft first:border-0 first:pt-0"
                          >
                            <span aria-hidden className="text-clay/50">
                              ?
                            </span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {guide.word.raw.length ? (
                    <div className="mt-6 space-y-2 text-[0.95rem] leading-relaxed text-ink-soft">
                      {guide.word.raw.map((l, i) => (
                        <p key={i}>{l}</p>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* Works */}
              {guide.works ? (
                <section
                  id="works"
                  className="scroll-mt-24 rounded-xl border border-hairline bg-paper-bright p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    {step(4)}
                    <h2 className="font-display text-2xl">Works</h2>
                  </div>

                  {guide.works.applyIntro ? (
                    <div className="mt-5">
                      <p className="label text-ink-mute">Apply it</p>
                      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                        {guide.works.applyIntro}
                      </p>
                    </div>
                  ) : null}

                  {guide.works.smart.length ? (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {guide.works.smart.map((s) => (
                        <li
                          key={s}
                          className="label rounded-full bg-ink/5 px-2.5 py-1 text-ink-mute"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {guide.works.iWill ? (
                    <p className="mt-5 rounded-lg border border-dashed border-clay/40 bg-clay/5 px-4 py-4 font-display text-lg text-ink">
                      {guide.works.iWill}
                    </p>
                  ) : null}

                  {guide.works.share ? (
                    <div className="mt-6">
                      <p className="label text-ink-mute">Share it</p>
                      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                        {guide.works.share}
                      </p>
                    </div>
                  ) : null}

                  {guide.works.raw.length ? (
                    <div className="mt-6 space-y-2 text-[0.95rem] leading-relaxed text-ink-soft">
                      {guide.works.raw.map((l, i) => (
                        <p key={i}>{l}</p>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* Pray · Care · Share */}
              {guide.prayCareShare ? (
                <section
                  id="pray-care-share"
                  className="scroll-mt-24 rounded-xl border border-hairline bg-paper-bright p-6 sm:p-8"
                >
                  <h2 className="font-display text-2xl">Pray · Care · Share</h2>
                  <p className="mt-2 text-[0.85rem] text-ink-mute">
                    One step in each direction, before the group meets again.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ["Pray", guide.prayCareShare.pray],
                        ["Care", guide.prayCareShare.care],
                        ["Share", guide.prayCareShare.share],
                      ] as const
                    ).map(([label, body]) =>
                      body ? (
                        <div
                          key={label}
                          className="rounded-lg border border-hairline bg-paper p-4"
                        >
                          <p className="label text-clay">{label}</p>
                          <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
                            {body.replace(
                              /^(this week, )?(pray|care|share)\b[:,]?\s*/i,
                              "",
                            )}
                          </p>
                        </div>
                      ) : null,
                    )}
                  </div>
                </section>
              ) : null}

              {/* Weekly Prayer Points */}
              {guide.prayerPoints.length ? (
                <section
                  id="prayer-points"
                  className="scroll-mt-24 rounded-xl border border-hairline bg-paper-bright p-6 sm:p-8"
                >
                  <h2 className="font-display text-2xl">Weekly Prayer Points</h2>
                  <div className="mt-5 space-y-2">
                    {guide.prayerPoints.map((g, i) => (
                      <details
                        key={g.heading}
                        open={i === 0}
                        className="rounded-lg border border-hairline bg-paper [&_summary]:list-none"
                      >
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                          <span className="text-[0.95rem] font-semibold text-ink">
                            {g.heading}
                          </span>
                          <span
                            aria-hidden
                            className="text-ink-mute transition-transform [details[open]_&]:rotate-180"
                          >
                            ⌄
                          </span>
                        </summary>
                        <ul className="space-y-2 px-4 pb-4">
                          {g.items.map((it, j) => (
                            <li
                              key={j}
                              className="flex gap-2.5 text-[0.88rem] leading-relaxed text-ink-soft"
                            >
                              <span aria-hidden className="text-clay/50">
                                •
                              </span>
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Memory Verse */}
              {guide.memoryVerseReference ? (
                <section
                  id="memory-verse"
                  className="scroll-mt-24 rounded-xl bg-clay p-6 text-paper-bright sm:p-8"
                >
                  <p className="label text-paper-bright/70">Memory verse</p>
                  <p className="font-display mt-3 text-2xl leading-tight">
                    {guide.memoryVerseReference}
                  </p>
                  {guide.memoryVerseText ? (
                    <p className="mt-3 text-[1.05rem] leading-relaxed text-paper-bright/95">
                      {guide.memoryVerseText}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {/* Footer actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Link
                  href="/watch/4ws"
                  className="label border border-hairline px-4 py-2.5 text-ink-mute transition-colors hover:border-ink hover:text-ink"
                >
                  ← All 4Ws
                </Link>
                <a
                  href={guide.source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label border border-hairline px-4 py-2.5 text-ink-mute transition-colors hover:border-ink hover:text-ink"
                >
                  View on ccf.org.ph ↗
                </a>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

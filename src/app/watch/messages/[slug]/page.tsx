import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { MessageArt, MessageCard } from "@/components/cards";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  getFourWsWeeks,
  getMessage,
  getMessages,
  getRelatedMessages,
} from "@/lib/queries";
import { fmtDate, fmtDuration } from "@/lib/format";
import { SaveButton, ShareButton } from "./actions";

/** Live from CCF's channel: refresh hourly so new messages appear
 *  without a redeploy, and resolve slugs published since the last build. */
export const revalidate = 3600;
export const dynamicParams = true;


export async function generateStaticParams() {
  const all = await getMessages();
  return all.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/watch/messages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = await getMessage(slug);
  if (!m) return { title: "Message not found" };
  return {
    title: m.title,
    description: m.description ?? undefined,
    openGraph: {
      title: `${m.title} — CCF Centris`,
      description: m.description ?? undefined,
      type: "video.other",
    },
  };
}

export default async function MessagePage({
  params,
}: PageProps<"/watch/messages/[slug]">) {
  const { slug } = await params;
  const m = await getMessage(slug);
  if (!m) notFound();

  const related = await getRelatedMessages(m);
  const w = m.four_ws;

  // Match this message to a synced 4Ws week by title so "the guide" points at
  // the real, auto-updating page rather than a placeholder.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const fourWsWeek = (await getFourWsWeeks()).find(
    (wk) => norm(wk.title) === norm(m.title),
  );
  const fourWsHref =
    fourWsWeek && fourWsWeek.hasGuide
      ? `/watch/4ws/${fourWsWeek.slug}`
      : "/watch/4ws";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: m.title,
    description: m.description ?? "",
    uploadDate: m.preached_on,
    duration: m.duration_seconds
      ? `PT${Math.floor(m.duration_seconds / 60)}M`
      : undefined,
    publisher: { "@type": "Organization", name: "CCF Centris" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Player */}
      <Section tone="ink" className="py-10 sm:py-14">
        <Container>
          <Breadcrumbs
            tone="dark"
            className="mb-6"
            items={[
              { label: "Watch", href: "/watch" },
              { label: "Messages", href: "/watch/messages" },
              { label: m.title },
            ]}
          />

          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <div className="aspect-video w-full overflow-hidden border border-white/15 bg-black">
                {m.sermon_video_key ? (
                  <iframe
                    title={m.title}
                    src={`https://www.youtube-nocookie.com/embed/${m.sermon_video_key}?rel=0`}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <MessageArt
                    seed={m.slug}
                    label={m.series?.title}
                    className="h-full w-full"
                  />
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {m.series ? (
                  <Link
                    href={`/watch/series/${m.series.slug}`}
                    className="btn-press label border border-white/25 px-4 py-2.5 text-paper-bright transition-colors hover:bg-white/10"
                  >
                    More from this series
                  </Link>
                ) : null}
              </div>
              {m.also_preached_by?.length ? (
                <p className="mt-3 text-[0.8rem] text-paper-bright/50">
                  Also preached this Sunday by{" "}
                  {m.also_preached_by.map((a, i) => (
                    <span key={a.video_key}>
                      {i > 0 ? ", " : ""}
                      <Link
                        href={`/watch/speakers/${a.speaker.slug}`}
                        className="underline underline-offset-4 hover:text-paper-bright"
                      >
                        {a.speaker.name}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              ) : null}
              <p className="mt-3 text-[0.8rem] text-paper-bright/40">
                Streamed from CCF&rsquo;s channel.
              </p>
            </div>

            <div>
              {m.series ? (
                <Link
                  href={`/watch/series/${m.series.slug}`}
                  className="label text-clay underline underline-offset-4"
                >
                  {m.series.title}
                </Link>
              ) : null}
              <h1 className="display-md mt-3">{m.title}</h1>

              <dl className="mt-7 divide-y divide-white/10 border-y border-white/10">
                {[
                  [
                    "Speaker",
                    m.speaker ? (
                      <Link
                        key="sp"
                        href={`/watch/speakers/${m.speaker.slug}`}
                        className="underline underline-offset-4"
                      >
                        {m.speaker.name}
                      </Link>
                    ) : (
                      "—"
                    ),
                  ],
                  ["Preached", fmtDate(m.preached_on)],
                  ["Passage", m.scripture ?? "—"],
                  ["Length", fmtDuration(m.duration_seconds) || "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-4 py-3">
                    <dt className="label text-paper-bright/50">{k}</dt>
                    <dd className="text-right text-[0.95rem]">{v}</dd>
                  </div>
                ))}
              </dl>

              {m.description ? (
                <p className="mt-6 leading-relaxed text-paper-bright/75">
                  {m.description}
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-2">
                <SaveButton slug={m.slug} />
                <ShareButton title={m.title} />
                {w ? (
                  <a
                    href="#four-ws"
                    className="label inline-flex items-center border border-white/25 px-4 py-2.5 text-paper-bright transition-colors hover:bg-white/10"
                  >
                    4Ws
                  </a>
                ) : null}
              </div>

              {m.topics.length ? (
                <div className="mt-7">
                  <p className="label text-paper-bright/50">Topics</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.topics.map((t) => (
                      <Link
                        key={t}
                        href={`/watch/messages?topic=${encodeURIComponent(t)}`}
                        className="label border border-white/25 px-3 py-1.5 text-paper-bright/80 transition-colors hover:bg-white/10"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      {/* 4Ws */}
      {w ? (
        <Section id="four-ws" tone="deep" className="scroll-mt-24">
          <Container>
            <SectionHead
              eyebrow="4Ws"
              title="Take this to your Dgroup"
              lead="Every message comes with a discussion guide built around CCF's four movements: Welcome, Worship, Word, and Works."
              action={
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/grow/find-a-dgroup" tone="outline">
                    Find a Dgroup
                  </ButtonLink>
                  <ButtonLink href={fourWsHref}>Open the full 4Ws</ButtonLink>
                </div>
              }
            />

            <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {[
                ["Welcome", w.welcome_md],
                ["Worship", w.worship_md],
                ["Word", w.word_md],
                ["Works", w.works_md],
              ].map(([label, body]) =>
                body ? (
                  <div key={label} className="bg-paper-bright p-7">
                    <p className="font-display text-3xl text-clay/30">{label}</p>
                    <div className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-ink-soft">
                      {String(body)
                        .split("\n")
                        .map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>

            <p className="mt-5 text-[0.85rem] text-ink-mute">
              Leaders can share this straight to their group.{" "}
              <Link href="/watch/4ws" className="text-clay underline underline-offset-4">
                Browse previous 4Ws
              </Link>
            </p>
          </Container>
        </Section>
      ) : null}

      {/* Notes and transcript */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
            <div>
              <Eyebrow>Message notes</Eyebrow>
              <h2 className="display-md mt-4">Follow along</h2>
              <div className="mt-6 border border-dashed border-hairline bg-paper-bright p-8">
                <p className="leading-relaxed text-ink-soft">
                  Notes and a searchable transcript are attached per message in
                  the admin. Once a transcript is uploaded, its text becomes
                  searchable across the whole archive, so someone looking for
                  &ldquo;anxiety&rdquo; finds the exact minute it was discussed.
                </p>
                <ButtonLink href="/search" tone="outline" className="mt-6">
                  Try searching the archive
                </ButtonLink>
              </div>
            </div>

            <aside className="border border-hairline bg-paper-bright p-6">
              <p className="label text-clay">In this series</p>
              {m.series ? (
                <>
                  <p className="font-display mt-3 text-2xl leading-tight">
                    {m.series.title}
                  </p>
                  {m.series.subtitle ? (
                    <p className="mt-1 text-[0.88rem] italic text-ink-mute">
                      {m.series.subtitle}
                    </p>
                  ) : null}
                  {m.series.description ? (
                    <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-soft">
                      {m.series.description}
                    </p>
                  ) : null}
                  <ButtonLink
                    href={`/watch/series/${m.series.slug}`}
                    tone="outline"
                    size="sm"
                    full
                    className="mt-5"
                  >
                    All in this series
                  </ButtonLink>
                </>
              ) : (
                <p className="mt-3 text-[0.9rem] text-ink-mute">
                  This message stands on its own.
                </p>
              )}

              <div className="mt-7 border-t border-hairline pt-6">
                <p className="label text-clay">Passage</p>
                <p className="font-display mt-2 text-xl">{m.scripture}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.bible_books.map((b) => (
                    <Pill key={b} tone="muted">
                      {b}
                    </Pill>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {related.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead eyebrow="Related" title="You might also want" />
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <MessageCard key={r.id} m={r} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

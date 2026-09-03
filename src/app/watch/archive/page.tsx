import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  EmptyState,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { getCollections, getSeriesArchive, KIND_LABEL } from "@/lib/channel";
import { YOUTUBE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sunday archive",
  description:
    "Every CCF Sunday teaching series, with its Run Through, Fast Track, and Snippets. Years of Sunday messages in one archive.",
};

/** Playlist data revalidates on its own schedule inside the API client. */
export const revalidate = 21600;

export default async function ArchivePage() {
  const [series, collections] = await Promise.all([
    getSeriesArchive(),
    getCollections(),
  ]);

  const withMain = series.filter((s) => s.main);
  const rest = series.filter((s) => !s.main);

  return (
    <>
      <PageHeader
        eyebrow="Sunday archive"
        title="Every series CCF has taught."
        lead="Sunday messages going back years, each with the Run Through, Fast Track, and Snippets that go alongside it. Pulled live from CCF's channel."
        actions={
          <>
            <ButtonLink href="/watch/messages" size="lg">
              Search messages
            </ButtonLink>
            <a
              href={`${YOUTUBE.channelUrl}/playlists`}
              target="_blank"
              rel="noreferrer"
              className="label inline-flex items-center border border-ink px-7 py-3.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
            >
              All playlists on YouTube
            </a>
          </>
        }
      />

      {series.length === 0 ? (
        <Section>
          <Container>
            <EmptyState
              title="The channel archive is unavailable right now."
              body="This section reads CCF's YouTube channel directly. It will fill again as soon as the channel responds."
              action={
                <ButtonLink href="/watch/messages" tone="outline">
                  Browse messages instead
                </ButtonLink>
              }
            />
          </Container>
        </Section>
      ) : null}

      {withMain.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="Teaching series"
              title="Sunday message series"
              lead={`${withMain.length} series, each with everything CCF published alongside it.`}
            />

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {withMain.map((g) => (
                <article
                  key={g.series}
                  className="group flex flex-col border border-hairline bg-paper-bright"
                >
                  <a
                    href={g.main!.href}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block aspect-video overflow-hidden"
                  >
                    {g.cover ? (
                      <img
                        src={g.cover}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="halftone h-full w-full bg-paper-deep" />
                    )}
                    <span className="label absolute bottom-2 right-2 bg-night/85 px-2 py-1 text-paper-bright">
                      {g.main!.itemCount} videos
                    </span>
                  </a>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-xl leading-tight">
                      <a
                        href={g.main!.href}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors group-hover:text-clay"
                      >
                        {g.series}
                      </a>
                    </h2>

                    {g.companions.length ? (
                      <div className="mt-auto pt-5">
                        <p className="label text-ink-mute">Also published</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {g.companions.map((c) => (
                            <li key={c.id}>
                              <a
                                href={c.href}
                                target="_blank"
                                rel="noreferrer"
                                className="label inline-flex items-center gap-1 border border-ink/20 px-2.5 py-1.5 text-ink-soft transition-colors hover:border-ink hover:text-ink"
                              >
                                {KIND_LABEL[c.kind]}
                                {c.itemCount ? (
                                  <span className="text-ink-mute">
                                    {c.itemCount}
                                  </span>
                                ) : null}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {rest.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead
              eyebrow="Specials and one-offs"
              title="Beyond the Sunday series"
              lead="Holy Week, anniversaries, prayer and fasting, conferences, and everything else CCF has published as its own collection."
            />
            <ul className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
              {rest.slice(0, 24).map((g) => {
                const first = g.companions[0];
                if (!first) return null;
                return (
                  <li key={g.series}>
                    <a
                      href={first.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex h-full items-start gap-4 bg-paper-bright p-5 transition-colors hover:bg-bone"
                    >
                      {first.thumbnail ? (
                        <img
                          src={first.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-16 w-28 shrink-0 border border-hairline object-cover"
                        />
                      ) : null}
                      <span className="min-w-0">
                        <span className="font-display block text-lg leading-tight transition-colors group-hover:text-clay">
                          {g.series}
                        </span>
                        <span className="label mt-1.5 block text-ink-mute">
                          {g.companions.length}{" "}
                          {g.companions.length === 1 ? "playlist" : "playlists"}
                          {g.totalVideos ? ` · ${g.totalVideos} videos` : ""}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </Container>
        </Section>
      ) : null}

      {collections.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="Collections"
              title="CCF's long-running playlists"
              lead="Ongoing collections that span every series, some going back more than a decade."
            />
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {collections.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-full flex-col border border-hairline bg-paper-bright transition-colors hover:border-ink"
                  >
                    <span className="relative block aspect-video overflow-hidden">
                      {c.thumbnail ? (
                        <img
                          src={c.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <span className="halftone block h-full w-full bg-paper-deep" />
                      )}
                    </span>
                    <span className="flex flex-1 flex-col p-5">
                      <span className="font-display text-lg leading-tight transition-colors group-hover:text-clay">
                        {c.title}
                      </span>
                      <span className="label mt-auto pt-4 text-ink-mute">
                        {c.itemCount.toLocaleString()} videos
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-[0.85rem] text-ink-mute">
              Playlists open on CCF&rsquo;s YouTube channel. Titles and counts
              refresh automatically as CCF publishes.
            </p>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, EmptyState, Section, SectionHead } from "@/components/ui";
import {
  SeriesDisclosure,
  type SeriesRow,
} from "@/components/series-disclosure";
import {
  getSeriesArchive,
  getSeriesVideos,
  KIND_LABEL,
} from "@/lib/channel";
import { hqThumb } from "@/lib/youtube-api";
import { fmtDayLong } from "@/lib/format";
import { YOUTUBE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Series",
  description:
    "Every CCF teaching series, pulled live from the channel. Open a series to watch its messages without leaving the page.",
};

/**
 * Hourly. Series metadata has a longer cache inside the API client; this only
 * governs how fast a newly published series shows up.
 */
export const revalidate = 3600;

/** How many series get their videos loaded eagerly (1 API unit each). */
const EAGER = 12;

export default async function SeriesIndexPage() {
  const archive = await getSeriesArchive();
  const withMain = archive.filter((g) => g.main);

  // Load videos for the first EAGER series so they can expand in place; the
  // rest expand to a "watch on the playlist" link until they're opened.
  const eagerVideos = await Promise.all(
    withMain.slice(0, EAGER).map(async (g) =>
      g.main ? getSeriesVideos(g.main.id, 200) : [],
    ),
  );

  const rows: SeriesRow[] = withMain.map((g, i) => {
    const main = g.main!;
    // Cover is a ytimg maxres URL; derive the always-present hq fallback.
    const coverId = g.cover.match(/\/vi\/([^/]+)\//)?.[1];
    // "Sunday series" reads oddly when the only playlist is a trailer.
    const kindLabel =
      main.kind === "series" || main.kind === "special"
        ? KIND_LABEL[main.kind]
        : "Teaching series";
    return {
      slug: g.slug,
      series: g.series,
      kindLabel,
      cover: g.cover,
      coverFallback: coverId ? hqThumb(coverId) : g.cover,
      itemCount: main.itemCount,
      playlistHref: main.href,
      companions: g.companions.map((c) => ({
        label: KIND_LABEL[c.kind],
        href: c.href,
        count: c.itemCount,
      })),
      videos: (eagerVideos[i] ?? []).map((v) => ({
        id: v.id,
        title: v.title,
        publishedAt: v.publishedAt,
        href: v.href,
      })),
    };
  });

  const featured = rows.slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Series"
        title="Teaching in sequence."
        lead="Every series CCF has taught, pulled live from its channel. Open one to watch its messages here, or jump out to the full playlist on YouTube."
        actions={
          <a
            href={`${YOUTUBE.channelUrl}/playlists`}
            target="_blank"
            rel="noreferrer"
            className="label inline-flex items-center border border-ink px-7 py-3.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            All playlists on YouTube
          </a>
        }
      />

      {rows.length === 0 ? (
        <Section>
          <Container>
            <EmptyState
              title="The series archive is unavailable right now."
              body="This reads CCF's YouTube channel directly and will fill again as soon as the channel responds."
            />
          </Container>
        </Section>
      ) : null}

      {featured.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="Start here"
              title="Featured series"
              lead="A few of the most recent series. Open one to watch straight away."
            />
            <div className="mt-10 space-y-5">
              {featured.map((row) => (
                <SeriesDisclosure key={row.slug} row={row} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {rows.length > featured.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead
              eyebrow="Everything else"
              title="The full series archive"
              lead={`${rows.length} series in total.`}
            />
            <div className="mt-10 space-y-5">
              {rows.slice(featured.length).map((row) => (
                <SeriesDisclosure key={row.slug} row={row} />
              ))}
            </div>
            <p className="mt-8 text-[0.85rem] text-ink-mute tabular">
              Updated automatically as CCF publishes. Last refreshed{" "}
              {fmtDayLong(new Date())}.
            </p>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import type { Replay } from "@/lib/ccf-net";
import { getPastReplays, getWatchReplay } from "@/lib/watch";
import { YouTubeThumb } from "@/components/youtube-thumb";
import {
  getCurrentFourWsGuide,
  type FourWsCurrent,
} from "@/lib/content/public-queries";
import { CCF_NET, youtubeEmbed } from "@/lib/site";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = {
  title: "Watch",
  description:
    "Last Sunday's message from CCF Net, with this week's 4Ws guide to study it in your Dgroup.",
};

/** Re-read CCF Net every half hour; admin changes refresh it at once. */
export const revalidate = 1800;

/**
 * Watch is one thing: last Sunday's replay, with the week's 4Ws beside it,
 * then earlier Sundays. The replay follows CCF Net unless an admin pinned
 * another (see lib/watch and /admin/watch); the 4Ws come from the content
 * snapshot. Older routes under /watch/* still resolve but aren't linked.
 */
export default async function WatchPage() {
  const [{ replay }, current] = await Promise.all([
    getWatchReplay(),
    getCurrentFourWsGuide(),
  ]);
  const past = await getPastReplays(replay?.videoId ?? null, 9);

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="Last Sunday’s message."
        lead="Catch up on the message, then take it into your Dgroup with this week’s 4Ws."
      />

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            {replay ? (
              <ReplayPanel replay={replay} current={current} />
            ) : (
              <ReplayMissing />
            )}
            {current ? <FourWsPanel current={current} /> : null}
          </div>

          {past.length ? <PastSundays replays={past} /> : null}

          <div className="mt-14 border-t border-hairline pt-8">
            <div className="max-w-3xl border-l-2 border-clay pl-5">
              <p className="label text-clay">Courtesy of {CCF_NET.name}</p>
              <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-soft">
                This video is courtesy of CCF Net, our online church community.
                If you know anyone who does not have a CCF satellite or home
                fellowship near their area, send them the link below to invite
                them to be part of our online church community.
              </p>
              <CopyLink url={CCF_NET.url} />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function ReplayPanel({
  replay,
  current,
}: {
  replay: Replay;
  current: FourWsCurrent | null;
}) {
  const byline = [replay.speaker, replay.dateLabel].filter(Boolean).join(" · ");
  // Describe the message from this week's 4Ws only when both are the same
  // Sunday. Otherwise the passage and outline belong to a different message.
  const paired =
    current !== null && replay.date !== null && current.week.serviceDate === replay.date;
  const word = paired ? current.guide?.word : null;
  const passage = word?.passageRef ? titleCase(word.passageRef) : null;
  const points = word?.pointItOut.slice(0, 4) ?? [];

  return (
    <article>
      <div className="aspect-video w-full overflow-hidden border border-hairline bg-ink">
        <iframe
          src={youtubeEmbed(replay.videoId)}
          title={replay.title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>

      {byline ? <p className="label mt-6 text-clay">{byline}</p> : null}
      <h2 className="display-md mt-2">{replay.title}</h2>

      {paired && passage ? (
        <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft">
          {replay.speaker ? `${replay.speaker} preaches` : "The message is"} from{" "}
          {passage}. Dgroups study it this week in the 4Ws guide{" "}
          <em>{withFinalStop(current.week.title)}</em>
        </p>
      ) : (
        <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft">
          Streamed on CCF Net, CCF&rsquo;s online church.
        </p>
      )}

      {points.length ? (
        <div className="mt-6">
          <p className="label text-ink-mute">What it covers</p>
          <ul className="mt-3 space-y-2">
            {points.map((p) => (
              <li
                key={p.heading}
                className="border-l-2 border-clay pl-3 text-[0.98rem] text-ink"
              >
                {titleCase(p.heading)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Earlier Sundays from the replay library. CCF Net only ever shows the latest,
 * and its videos are unlisted, so this is the only place to find them again.
 */
function PastSundays({ replays }: { replays: Replay[] }) {
  return (
    <section aria-labelledby="past-h" className="mt-16 border-t border-hairline pt-10">
      <h2 id="past-h" className="display-md">Past Sundays</h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {replays.map((r) => (
          <li key={r.videoId}>
            <a
              href={`https://www.youtube.com/watch?v=${r.videoId}`}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <span className="relative block aspect-video overflow-hidden border border-hairline">
                <YouTubeThumb videoId={r.videoId} alt={r.title} />
              </span>
              <span className="label mt-3 block text-clay">
                {[r.speaker, r.dateLabel].filter(Boolean).join(" · ")}
              </span>
              <span className="font-display mt-1 block text-xl leading-snug text-ink group-hover:text-clay">
                {r.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReplayMissing() {
  return (
    <div className="grid aspect-video place-items-center border border-hairline bg-paper-bright p-8 text-center">
      <div>
        <p className="label text-clay">Replay not available here</p>
        <p className="mx-auto mt-3 max-w-md text-[1rem] leading-relaxed text-ink-soft">
          Last Sunday&rsquo;s message couldn&rsquo;t be loaded from CCF Net just
          now. You can watch it there directly.
        </p>
        <ButtonLink
          href={CCF_NET.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5"
        >
          Watch on CCF Net
        </ButtonLink>
      </div>
    </div>
  );
}

function FourWsPanel({ current }: { current: FourWsCurrent }) {
  const { week, guide } = current;
  const pdf = guide?.downloadUrl ?? null;

  return (
    <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
      <p className="label text-clay">This week&rsquo;s 4Ws</p>
      <h2 className="font-display mt-3 text-2xl leading-tight">{week.title}</h2>
      {week.dateSpan ? (
        <p className="mt-1 text-[0.85rem] text-ink-mute">{week.dateSpan}</p>
      ) : null}
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
        The 4Ws (Welcome, Worship, Word, Works) is CCF&rsquo;s weekly guide for
        Dgroups. It turns Sunday&rsquo;s message into questions to talk through
        and one thing to put into practice.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {pdf ? (
          <ButtonLink href={pdf} target="_blank" rel="noreferrer" full>
            Download the 4Ws (PDF)
          </ButtonLink>
        ) : null}
        <ButtonLink href={`/watch/4ws/${week.slug}`} tone="outline" full>
          Read it online
        </ButtonLink>
      </div>
    </aside>
  );
}

/** End a title with a full stop unless it already carries its own. */
function withFinalStop(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** CCF sets passage references and outline headings in capitals. */
function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s(“"-])([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
}

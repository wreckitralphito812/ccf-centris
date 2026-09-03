import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  LiveDot,
  Section,
  SectionHead,
} from "@/components/ui";
import { MessageCard } from "@/components/cards";
import { Countdown } from "@/components/service-status";
import { YouTubeThumb } from "@/components/youtube-thumb";
import { getLatestMessage, getMessages, getServiceWindow } from "@/lib/queries";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { SITE, YOUTUBE, youtubeLiveEmbed } from "@/lib/site";
import { getChannelVideos } from "@/lib/youtube";
import { getLiveBroadcast } from "@/lib/youtube-api";
import { getSundayServices } from "@/lib/services";

export const metadata: Metadata = {
  title: "Watch live",
  description:
    "Watch CCF Centris worship services live, or catch the next one. Sunday services stream from Eton Centris, Quezon City.",
};

/** Live state depends on the clock, so never cache this page. */
export const dynamic = "force-dynamic";

export default async function WatchLivePage() {
  const [window, latest, messages, channel, sunday] = await Promise.all([
    getServiceWindow(),
    getLatestMessage(),
    getMessages(),
    // Live from CCF's channel, so this stays current between deploys.
    getChannelVideos(8),
    // Sunday-service state: live / next scheduled / archive, self-correcting.
    // This page is force-dynamic, so the 60s live check is fine here.
    getSundayServices({ checkLive: true }),
  ]);

  // The API is the source of truth for whether a stream is actually running.
  // The local schedule is only a fallback when the API is unavailable.
  const broadcast = await getLiveBroadcast();

  const live = broadcast ? (window.current ?? window.next ?? null) : window.current;
  const nextService = sunday.next;

  return (
    <>
      {live ? (
        <>
          <div className="bg-clay text-paper-bright">
            <Container className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <span className="label flex items-center gap-2">
                <LiveDot />
                Live now
              </span>
              <p className="text-[0.95rem]">
                {broadcast?.title ?? live.title}
                {live.venue ? ` · ${live.venue.name}` : ""}
                {broadcast?.startedAt
                  ? ` · started ${fmtTime(broadcast.startedAt)}`
                  : ` · started ${fmtTime(live.starts_at)}`}
              </p>
              {broadcast?.concurrentViewers ? (
                <p className="label ml-auto">
                  {broadcast.concurrentViewers.toLocaleString()} watching
                </p>
              ) : null}
            </Container>
          </div>

          <Section tone="ink" className="py-10 sm:py-14">
            <Container>
              <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <div className="aspect-video w-full border border-white/15 bg-black">
                    <iframe
                      title={`${live.title} live stream`}
                      src={
                        broadcast
                          ? `https://www.youtube.com/embed/${broadcast.videoId}?autoplay=1&rel=0`
                          : youtubeLiveEmbed()
                      }
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                  <p className="mt-3 text-[0.8rem] text-paper-bright/45">
                    Streaming from CCF&rsquo;s official channel,{" "}
                    <a
                      href={YOUTUBE.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 hover:text-paper-bright"
                    >
                      {YOUTUBE.handle}
                    </a>
                    . Provider and channel are set per service in the admin.
                  </p>
                </div>

                <div>
                  <Eyebrow tone="paper">On now</Eyebrow>
                  <h1 className="display-md mt-4">{live.title}</h1>
                  <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
                    {[
                      ["Speaker", live.speaker?.name ?? "—"],
                      ["Series", live.series?.title ?? "—"],
                      ["Venue", live.venue?.name ?? "—"],
                      ["Started", fmtTime(live.starts_at)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-3">
                        <dt className="label text-paper-bright/50">{k}</dt>
                        <dd className="text-right text-[0.95rem]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {live.series?.description ? (
                    <p className="mt-5 text-[0.92rem] leading-relaxed text-paper-bright/70">
                      {live.series.description}
                    </p>
                  ) : null}
                  <div className="mt-7 flex flex-wrap gap-3">
                    <ButtonLink
                      href="/care/prayer"
                tone="on-dark"
                    >
                      Request prayer
                    </ButtonLink>
                    <ButtonLink
                      href="/grow/find-a-dgroup"
                      tone="ghost-on-dark"
                      
                    >
                      Find a Dgroup →
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </Container>
          </Section>
        </>
      ) : (
        <PageHeader
          eyebrow="Watch live"
          title={
            window.next ? (
              <>
                Next live service is{" "}
                <span className="italic text-clay">
                  {fmtDayLong(window.next.starts_at)}
                </span>
                .
              </>
            ) : (
              "Nothing streaming right now."
            )
          }
          lead={
            window.next
              ? `${window.next.title} at ${fmtTime(window.next.starts_at)}, ${window.next.venue?.name}. The stream opens a few minutes before we start.`
              : "Check the service times, or watch any message from the archive."
          }
          actions={
            <>
              {window.next ? (
                <AddToCalendar
                  title={`${window.next.title} — CCF Centris`}
                  start={window.next.starts_at}
                  end={window.next.ends_at}
                />
              ) : null}
              <ButtonLink href="/watch/messages" tone="outline" size="lg">
                Browse messages
              </ButtonLink>
            </>
          }
        />
      )}

      {!live && nextService ? (
        <Section tone="bright" className="py-10">
          <Container>
            <p className="label text-clay">Next Sunday service</p>
            <div className="mt-4 grid gap-6 border border-hairline bg-paper-bright p-5 sm:grid-cols-[20rem_1fr] sm:items-center sm:p-6">
              <div className="relative aspect-video overflow-hidden border border-hairline">
                {nextService.thumbnail && nextService.videoId ? (
                  <YouTubeThumb
                    videoId={nextService.videoId}
                    src={nextService.thumbnail}
                    alt={nextService.title}
                  />
                ) : (
                  <div className="halftone h-full w-full bg-paper-deep" />
                )}
                <span className="label absolute left-2 top-2 bg-night/85 px-2 py-1 text-paper-bright">
                  Upcoming
                </span>
              </div>
              <div>
                <p className="font-display text-2xl leading-tight">
                  {nextService.title}
                </p>
                <p className="mt-2 text-[0.95rem] text-ink-soft tabular">
                  {fmtDayLong(nextService.scheduledFor)} ·{" "}
                  {fmtTime(nextService.scheduledFor)}
                </p>
                <p className="mt-1 text-[0.85rem] text-ink-mute">
                  Starts in{" "}
                  <span className="tabular">
                    <Countdown target={nextService.scheduledFor} />
                  </span>
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {nextService.watchUrl ? (
                    <a
                      href={nextService.watchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-press label inline-flex items-center border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
                    >
                      Set a reminder on YouTube
                    </a>
                  ) : (
                    <a
                      href={`${YOUTUBE.channelUrl}/streams`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-press label inline-flex items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                    >
                      See the schedule on YouTube
                    </a>
                  )}
                  <AddToCalendar
                    title={`${nextService.title} — CCF`}
                    start={nextService.scheduledFor}
                    end={new Date(
                      Date.parse(nextService.scheduledFor) + 2 * 60 * 60 * 1000,
                    ).toISOString()}
                  />
                </div>
                {!nextService.watchUrl ? (
                  <p className="mt-3 text-[0.8rem] text-ink-mute">
                    CCF hasn&rsquo;t created this stream yet. A reminder link
                    appears here once it&rsquo;s scheduled on the channel.
                  </p>
                ) : null}
              </div>
            </div>

            {sunday.upcoming.length ? (
              <div className="mt-6">
                <p className="label text-ink-mute">Future Sundays</p>
                <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
                  {sunday.upcoming.slice(0, 4).map((u) => (
                    <li
                      key={u.videoId ?? u.scheduledFor}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <span className="text-[0.92rem] tabular">
                        {fmtDayLong(u.scheduledFor)} · {fmtTime(u.scheduledFor)}
                      </span>
                      {u.watchUrl ? (
                        <a
                          href={u.watchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link label text-clay underline underline-offset-4"
                        >
                          Remind me
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Container>
        </Section>
      ) : null}

      {!live && nextService ? (
        <Section tone="deep" className="py-10">
          <Container>
            <p className="text-[0.85rem] text-ink-mute">
              Can&rsquo;t make it online? Come in person at {SITE.addressLines[0]},{" "}
              {SITE.addressLines[1]}.{" "}
              <Link href="/visit/directions" className="text-clay underline underline-offset-4">
                Directions
              </Link>
            </p>
          </Container>
        </Section>
      ) : null}

      {channel.length ? (
        <Section tone="bright">
          <Container>
            <SectionHead
              eyebrow="Straight from the CCF channel"
              title="Recently published"
              lead="Updates automatically as CCF publishes new services and messages."
              action={
                <a
                  href={YOUTUBE.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="label inline-flex items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                >
                  Visit the channel
                </a>
              }
            />
            <div className="no-bar mt-10 flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              {channel.slice(0, 4).map((v) => (
                <a
                  key={v.id}
                  href={v.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group w-[17rem] shrink-0 sm:w-auto"
                >
                  <div className="relative aspect-video overflow-hidden border border-hairline">
                    <YouTubeThumb
                      src={v.thumbnail}
                      fallbackSrc={v.thumbnailFallback}
                      alt=""
                      className="transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="font-display mt-3 text-lg leading-tight transition-colors group-hover:text-clay">
                    {v.title}
                  </p>
                  <p className="mt-1 text-[0.8rem] text-ink-mute">
                    {fmtDayLong(v.published)}
                  </p>
                </a>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container>
          <SectionHead
            eyebrow="While you wait"
            title="Recent messages"
            action={
              <ButtonLink href="/watch/messages" tone="outline">
                All messages
              </ButtonLink>
            }
          />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {messages.slice(0, 4).map((m) => (
              <MessageCard key={m.id} m={m} />
            ))}
          </div>
          {latest?.four_ws ? (
            <div className="mt-12 flex flex-col gap-4 border border-hairline bg-paper-bright p-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label text-clay">This week&rsquo;s 4Ws</p>
                <p className="font-display mt-2 text-2xl">{latest.title}</p>
              </div>
              <ButtonLink href={`/watch/messages/${latest.slug}#four-ws`}>
                Open the 4Ws
              </ButtonLink>
            </div>
          ) : null}
        </Container>
      </Section>
    </>
  );
}

function AddToCalendar({
  title,
  start,
  end,
}: {
  title: string;
  start: string;
  end: string;
}) {
  const fmt = (v: string) => v.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: SITE.addressLines.join(", "),
  });
  return (
    <a
      href={`https://calendar.google.com/calendar/render?${params}`}
      target="_blank"
      rel="noreferrer"
      className="label inline-flex items-center border border-clay bg-clay px-7 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep"
    >
      Add to calendar
    </a>
  );
}

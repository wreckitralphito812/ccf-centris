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
import { getLatestMessage, getMessages, getServiceWindow } from "@/lib/queries";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { SITE, YOUTUBE, youtubeLiveEmbed } from "@/lib/site";
import { getChannelVideos } from "@/lib/youtube";
import { getLiveBroadcast, getUpcomingBroadcast } from "@/lib/youtube-api";

export const metadata: Metadata = {
  title: "Watch live",
  description:
    "Watch CCF Centris worship services live, or catch the next one. Sunday services stream from Eton Centris, Quezon City.",
};

/** Live state depends on the clock, so never cache this page. */
export const dynamic = "force-dynamic";

export default async function WatchLivePage() {
  const [window, latest, messages, channel] = await Promise.all([
    getServiceWindow(),
    getLatestMessage(),
    getMessages(),
    // Live from CCF's channel, so this stays current between deploys.
    getChannelVideos(8),
  ]);

  // The API is the source of truth for whether a stream is actually running.
  // The local schedule is only a fallback when the API is unavailable.
  const [broadcast, upcoming] = await Promise.all([
    getLiveBroadcast(),
    getUpcomingBroadcast(),
  ]);

  const live = broadcast ? (window.current ?? window.next ?? null) : window.current;

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
                      className="border-paper-bright bg-paper-bright text-night hover:bg-bone hover:border-bone"
                    >
                      Request prayer
                    </ButtonLink>
                    <ButtonLink
                      href="/grow/find-a-dgroup"
                      tone="ghost"
                      className="text-paper-bright hover:bg-white/10 hover:border-white/25"
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

      {!live && upcoming?.scheduledFor ? (
        <Section tone="bright" className="py-10">
          <Container>
            <div className="flex flex-col gap-5 border border-hairline bg-paper-bright p-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label text-clay">Scheduled on CCF&rsquo;s channel</p>
                <p className="font-display mt-2 text-2xl leading-tight">
                  {upcoming.title}
                </p>
                <p className="mt-1 text-[0.9rem] text-ink-mute">
                  {fmtDayLong(upcoming.scheduledFor)}, {fmtTime(upcoming.scheduledFor)}
                </p>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${upcoming.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="label inline-flex shrink-0 items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
              >
                Set a reminder
              </a>
            </div>
          </Container>
        </Section>
      ) : null}

      {!live && window.next ? (
        <Section tone="deep" className="py-12">
          <Container>
            <div className="flex flex-col items-start gap-8 border border-hairline bg-paper-bright p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label text-ink-mute">Starts in</p>
                <p className="mt-2 text-5xl text-clay">
                  <Countdown target={window.next.starts_at} />
                </p>
              </div>
              <dl className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                {[
                  ["When", `${fmtDayLong(window.next.starts_at)}, ${fmtTime(window.next.starts_at)}`],
                  ["Where", window.next.venue?.name ?? "—"],
                  ["Speaker", window.next.speaker?.name ?? "—"],
                  ["Series", window.next.series?.title ?? "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="label text-ink-mute">{k}</dt>
                    <dd className="mt-0.5 text-[0.95rem]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-4 text-[0.85rem] text-ink-mute">
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
                    <img
                      src={v.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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

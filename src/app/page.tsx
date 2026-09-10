import Link from "next/link";
import {
  getCommunities,
  getLatestMessage,
  getServiceWindow,
  getSportsToday,
  getVolunteerRoles,
} from "@/lib/queries";
import { findDgroups, getCurrentFourWsGuide } from "@/lib/queries";
import { manilaDateKey, fmtDayLong, fmtTime, fmtUntil } from "@/lib/format";
import { MAPS_LINK, SERVICE_TIMES, SITE } from "@/lib/site";
import { ROOMS } from "@/data/rooms";
import {
  ButtonLink,
  Container,
  cx,
  Eyebrow,
  LiveDot,
  Pill,
  Section,
} from "@/components/ui";
import { CommunityCard, MessageArt } from "@/components/cards";
import { HeroBackdrop } from "@/components/hero-backdrop";
import {
  CardEntrance,
  CountUp,
  HeroStage,
  PulseDot,
  Reveal,
  RevealHead,
  RevealItem,
  Stagger,
} from "@/components/motion";
import { PlayGlyph, SectionIcon } from "@/components/icons";
import { YouTubeThumb } from "@/components/youtube-thumb";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { WelcomeVideo } from "@/components/welcome-video";
import { getSundayServices, type SundayServices } from "@/lib/services";
import {
  getFeaturedSeriesWithVideos,
  getFastTracksWithVideos,
} from "@/lib/channel";
import type {
  PlaylistWithVideos,
  SeriesGroupWithVideos,
} from "@/lib/channel";
import { SeriesPlayerCard } from "@/components/series-player-card";

/**
 * Revalidate hourly. The YouTube-backed sections (next Sunday service, most
 * recent archived service, featured series) then refresh on their own: when a
 * service airs it moves out of "next" and into the archive within the hour,
 * with no deploy.
 */
export const revalidate = 3600;

/**
 * Homepage, built for a first-time visitor and written in CCF's own voice:
 * warm, sincere, invitational, no irony. Seven sections in one plain sequence —
 *
 *   1. Welcome — who we are, and how to come (online or in person)
 *   2. Sunday's message — the latest teaching, with more from the CCF channel
 *   3. Watch with CCF — the live stream and teaching series
 *   4. Find your people — Dgroups first, then communities by life stage
 *   5. Serve — a place for you on a team
 *   6. The center — a look around, and the courts you can book
 *   7. Where we are — how to get here
 */
export default async function HomePage() {
  const [window, latest, communities, roles] =
    await Promise.all([
      getServiceWindow(),
      getLatestMessage(),
      getCommunities(),
      getVolunteerRoles(),
    ]);

  // Live from CCF's YouTube channel, revalidated on an interval.
  const [sunday, featuredSeries, fastTracks] = await Promise.all([
    getSundayServices(),
    getFeaturedSeriesWithVideos(3),
    getFastTracksWithVideos(4),
  ]);

  const today = manilaDateKey();
  const courts = await getSportsToday(today);
  const dgroups = await findDgroups({});
  const fourWs = await getCurrentFourWsGuide();

  const isLive = window.current !== null;

  return (
    <>
      <Welcome live={isLive} current={window.current} />

      <WatchWithCcf
        sunday={sunday}
        nextService={window.next}
        series={featuredSeries}
        fastTracks={fastTracks}
      />

      <SundayMessage
        latest={latest}
        fourWs={fourWs}
      />

      <WhatADgroupIs />

      <FindYourPeople count={dgroups.length} communities={communities} />

      <Serve roles={roles} />

      <TheCenter courts={courts} />

      <WhereWeAre />
    </>
  );
}

/* --- 1. Welcome ----------------------------------------------------------------

   Hero. Absorbs the live / next-service state as a single line under the
   buttons, so there's no separate service band to scroll past.
---------------------------------------------------------------------------- */

function Welcome({
  live,
  current,
}: {
  live: boolean;
  current: Awaited<ReturnType<typeof getServiceWindow>>["current"];
}) {
  return (
    <section className="relative flex min-h-[calc(100svh-var(--chrome,4rem))] items-center overflow-x-hidden bg-paper-deep">
      {/* Full-bleed CCF worship photo behind the whole hero. */}
      <HeroBackdrop poster="/photos/hero-welcome.jpg" />
      <Container wide className="relative w-full py-8 sm:py-8">
        {/* Copy sits on its own paper card so it holds against the photo. Its
            lines arrive top-to-bottom on load via HeroStage. */}
        <HeroStage className="relative max-w-xl border border-hairline bg-paper-bright/95 p-4 shadow-[0_30px_80px_-40px_rgba(23,21,15,0.6)] backdrop-blur-sm sm:max-w-2xl sm:p-7">
            {live ? (
              <Link
                href="/watch/live"
                className="label inline-flex items-center gap-2 bg-clay px-3 py-1.5 text-paper-bright"
              >
                <LiveDot />
                We&rsquo;re worshipping live right now
              </Link>
            ) : (
              /* The eyebrow names CCF before the center name in the headline
                 below. The header carries the official CCF Centris mark, so
                 the hero doesn't repeat it. */
              <Eyebrow rule={false}>
                Christ&rsquo;s Commission Fellowship
              </Eyebrow>
            )}

            {/* Set in the brand book's secondary face (--font-sans: Proxima
                Nova, then Montserrat). Sized display-lg, not display-xl: at the
                larger size "Welcome to" can't fit the card and the headline
                breaks across four lines, pushing the service time below the
                first screen. */}
            <h1 className="display-lg brand-face mt-3 sm:mt-4">
              Welcome to
              <br />
              <span className="text-clay">CCF Centris</span>
            </h1>

            <p className="font-display font-light tracking-wide mt-2.5 text-2xl text-ink-soft sm:text-3xl">
              worship, grow, connect, serve
            </p>

            {/* CCF's own welcome line, quoted verbatim from ccf.org.ph. */}
            <p className="mt-3.5 max-w-xl text-[0.98rem] leading-relaxed text-ink-soft sm:text-[1.02rem]">
              Regardless of who you are or where life has taken you, you are more
              than welcome here. We&rsquo;d love to meet you this Sunday at our
              new center on the second floor of Centris Station, right off the
              MRT.
            </p>

            {/* The service time itself, stated outright rather than behind a
                button. Reads SERVICE_TIMES, so it can't drift from the
                schedule. */}
            <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-hairline pt-4">
              {SERVICE_TIMES.map((s) => (
                <div key={`${s.dow}-${s.time}`}>
                  <dt className="label text-clay">{s.day}s</dt>
                  <dd className="font-display mt-1.5 text-3xl leading-none text-ink sm:text-4xl">
                    {s.time}
                  </dd>
                </div>
              ))}
            </dl>

            {live && current ? (
              <p className="mt-4 border-t border-hairline pt-3 text-[0.95rem] text-ink-soft sm:mt-5 sm:pt-4">
                <span className="label mr-2 text-clay">On now</span>
                {current.title}
                {current.speaker ? ` with ${current.speaker.name}` : ""} &middot;{" "}
                {current.venue?.name}
              </p>
            ) : null}
          </HeroStage>
      </Container>
    </section>
  );
}

/**
 * The four movements of a Dgroup meeting, in CCF's order. Phrased short here
 * for a narrow column; /watch/4ws carries the fuller explanation.
 */
const FOUR_WS = [
  ["Welcome", "An opening question that gets everyone talking."],
  ["Worship", "The passage read together, and prayer."],
  ["Word", "Questions that work through what it actually says."],
  ["Works", "One concrete step before the group meets again."],
] as const;

/* --- What a Dgroup is --------------------------------------------------------

   Explains the concept before "Find your people" invites the visitor in.
   Three parts: the definition, a diagram of the weekly 4Ws rhythm, and the
   four reasons to join (CCF's "four C's") with the verse behind each. Content
   is CCF's own, condensed from ccf.org.ph.
--------------------------------------------------------------------------- */

/**
 * The weekly rhythm of a Dgroup meeting, drawn as a loop: the four movements
 * run in order and the group comes back the next week to do it again. Pure
 * inline SVG in brand tones, matching the site's other hand-drawn marks.
 */
function DgroupRhythm() {
  // Four nodes evenly around a circle, starting at the top.
  const cx0 = 130;
  const cy0 = 130;
  const r = 92;
  const nodes = FOUR_WS.map(([name], i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    return { name, x: cx0 + r * Math.cos(a), y: cy0 + r * Math.sin(a) };
  });

  return (
    <figure className="border border-hairline bg-paper-bright p-6 sm:p-8">
      <figcaption className="label text-ink-mute">
        The weekly rhythm
      </figcaption>
      <svg
        viewBox="0 0 260 260"
        className="mx-auto mt-4 w-full max-w-[19rem]"
        role="img"
        aria-label="A Dgroup meeting moves through four steps each week — Welcome, Worship, Word, Works — then the group meets again the following week and repeats the cycle."
      >
        <defs>
          <marker
            id="rhythm-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0l10 5-10 5z" className="fill-clay" />
          </marker>
        </defs>

        {/* The loop, drawn as four arcs so each carries its own arrowhead. */}
        {nodes.map((n, i) => {
          const next = nodes[(i + 1) % 4];
          return (
            <path
              key={n.name}
              d={`M ${n.x} ${n.y} A ${r} ${r} 0 0 1 ${next.x} ${next.y}`}
              className="fill-none stroke-clay/45"
              strokeWidth={1.7}
              strokeDasharray="1 6"
              strokeLinecap="round"
              markerEnd="url(#rhythm-arrow)"
            />
          );
        })}

        {nodes.map((n, i) => (
          <g key={n.name}>
            <circle
              cx={n.x}
              cy={n.y}
              r={26}
              className="fill-paper stroke-clay/40"
              strokeWidth={1.5}
            />
            <text
              x={n.x}
              y={n.y - 2}
              textAnchor="middle"
              className="fill-clay-deep font-display"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              {n.name}
            </text>
            <text
              x={n.x}
              y={n.y + 11}
              textAnchor="middle"
              className="fill-ink-mute"
              style={{ fontSize: "8px" }}
            >
              {`step ${i + 1}`}
            </text>
          </g>
        ))}

        <text
          x={cx0}
          y={cy0 - 4}
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: "10px", fontWeight: 600 }}
        >
          every
        </text>
        <text
          x={cx0}
          y={cy0 + 9}
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: "10px", fontWeight: 600 }}
        >
          week
        </text>
      </svg>
      <p className="mt-4 text-[0.86rem] leading-relaxed text-ink-soft">
        One meeting moves through all four, then the group gathers again the
        next week and begins the cycle once more. It&rsquo;s a habit, not a
        course &mdash; there&rsquo;s no graduation.
      </p>
    </figure>
  );
}

/**
 * CCF's four reasons to join a Dgroup — the "four C's" — each with the verse
 * it rests on. Quoted from ccf.org.ph.
 */
const FOUR_CS = [
  {
    c: "Community",
    what: "Fellowship, and a safe place to share your life with others.",
    verse: "Bear one another's burdens, and thereby fulfill the law of Christ.",
    ref: "Galatians 6:2",
  },
  {
    c: "Care",
    what: "A spiritual family that supports, encourages, and prays for you.",
    verse:
      "Let us consider how to stimulate one another to love and good deeds … encouraging one another.",
    ref: "Hebrews 10:24–25",
  },
  {
    c: "Character",
    what: "Growth through honest accountability and building each other up.",
    verse: "Iron sharpens iron, so one man sharpens another.",
    ref: "Proverbs 27:17",
  },
  {
    c: "Collaboration",
    what: "A place to serve God shoulder to shoulder.",
    verse:
      "As each one has received a special gift, employ it in serving one another.",
    ref: "1 Peter 4:10",
  },
] as const;

function WhatADgroupIs() {
  return (
    <Section tone="bright" className="pt-10! pb-12! sm:pt-14! sm:pb-20!">
      <Container>
        <RevealHead
          eyebrow="What is a Dgroup?"
          icon="people"
          title="A small group, meeting every week"
          lead="A Dgroup — short for discipleship group — is a handful of people who meet regularly, share their lives, study the Bible together, and stay accountable to one another, all in the pursuit of becoming more like Christ."
        />

        <Reveal
          as="div"
          delay={0.05}
          className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start"
        >
          <DgroupRhythm />

          <div>
            <p className="label text-ink-mute">Why join one</p>
            <Stagger className="mt-4 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {FOUR_CS.map(({ c, what, verse, ref }) => (
                <div key={c} className="flex flex-col bg-paper-bright p-5">
                  <h3 className="font-display text-lg leading-tight text-clay-deep">
                    {c}
                  </h3>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">
                    {what}
                  </p>
                  <p className="mt-3 border-l-2 border-clay/40 pl-3 text-[0.82rem] italic leading-relaxed text-ink-mute">
                    &ldquo;{verse}&rdquo;
                    <span className="label mt-1 block not-italic text-clay">
                      {ref}
                    </span>
                  </p>
                </div>
              ))}
            </Stagger>

            <p className="mt-5 text-[0.92rem] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Who can join?</span>{" "}
              Anyone who wants to know God more, understand the Bible, and grow
              in a community of believers. You don&rsquo;t need to be a member,
              or to have it all figured out first.
            </p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

/* --- 2. Sunday's message ------------------------------------------------------

   The seeded "latest message" feature. The right-hand rail carries the message
   forward into a Dgroup — the 4Ws guide for this week, then the invitation to
   discuss it with a group. Listing other recent messages here would only repeat
   "Watch with CCF" below, which already covers the Sunday archive.
---------------------------------------------------------------------------- */

function SundayMessage({
  latest,
  fourWs,
}: {
  latest: Awaited<ReturnType<typeof getLatestMessage>>;
  fourWs: Awaited<ReturnType<typeof getCurrentFourWsGuide>>;
}) {
  if (!latest) return null;

  const guideHref = fourWs?.week.hasGuide
    ? `/watch/4ws/${fourWs.week.slug}`
    : "/watch/4ws";
  const clip = (s: string | null | undefined): string | null => {
    if (!s) return null;
    const t = s.replace(/\s+/g, " ").trim();
    return t.length > 96 ? `${t.slice(0, 95)}…` : t || null;
  };
  const GENERIC: Record<string, string> = Object.fromEntries(FOUR_WS);
  const g = fourWs?.guide;
  const movements: [string, string][] = g
    ? ([
        ["Welcome", clip(g.welcome)],
        [
          "Worship",
          g.worshipSongs.length ? clip(g.worshipSongs.slice(0, 4).join(", ")) : null,
        ],
        ["Word", clip(g.word?.passageRef ?? g.word?.passageText)],
        ["Works", clip(g.works?.applyIntro ?? g.works?.share)],
      ] as const).map(([name, val]) => [name, val ?? GENERIC[name]])
    : [];
  return (
    <Section tone="bright" className="pt-10! pb-12! sm:pt-12! sm:pb-16!">
      <Container>
        <RevealHead
          eyebrow="Sunday's message"
          icon="message"
          title="The message, whenever you need it"
          lead="Missed Sunday, or want to sit with it again? Every teaching is here to watch, with a 4Ws discussion guide for your Dgroup."
          action={
            <ButtonLink href="/watch/messages" tone="primary">
              All messages
            </ButtonLink>
          }
        />

        <Reveal
          as="div"
          delay={0.05}
          className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]"
        >
          <article>
            <Link
              href={`/watch/messages/${latest.slug}`}
              className="group block"
            >
              <div className="relative aspect-video overflow-hidden border border-hairline">
                {latest.sermon_video_key ? (
                  <YouTubeThumb
                    videoId={latest.sermon_video_key}
                    alt={latest.title}
                    loading="eager"
                  />
                ) : (
                  <MessageArt
                    seed={latest.slug}
                    label={latest.series?.title}
                    className="h-full w-full"
                  />
                )}
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay text-paper-bright">
                    <PlayGlyph className="ml-0.5 h-6 w-6" />
                  </span>
                </span>
              </div>
            </Link>
            <div className="mt-5">
              {latest.series ? (
                <Pill tone="clay">{latest.series.title}</Pill>
              ) : null}
              <h3 className="font-display mt-3 text-3xl leading-tight sm:text-4xl">
                {latest.title}
              </h3>
              <p className="mt-2 text-[0.95rem] text-ink-mute">
                {latest.speaker?.name} · {latest.scripture}
              </p>
              {latest.description ? (
                <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
                  {latest.description}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink
                  href={`/watch/messages/${latest.slug}`}
                  full
                  className="sm:w-auto"
                >
                  Watch the message
                </ButtonLink>
                <ButtonLink
                  href={guideHref}
                  tone="outline"
                  full
                  className="sm:w-auto"
                >
                  Get the 4Ws guide
                </ButtonLink>
              </div>
              <Link
                href="/grow/find-a-dgroup"
                className="link label mt-4 inline-block text-clay underline underline-offset-4 hover:text-clay-deep"
              >
                Talk it through in a Dgroup &rarr;
              </Link>
            </div>
          </article>

          <div>
            <div className="border border-hairline bg-paper p-5 sm:p-6">
              <p className="font-display text-2xl leading-tight">
                The 4Ws for this week
              </p>
              {fourWs ? (
                <p className="label mt-2 text-clay">
                  {fourWs.week.weekNumber
                    ? `Week ${fourWs.week.weekNumber} · `
                    : ""}
                  {fourWs.week.dateSpan ?? fourWs.week.serviceDateLabel}
                </p>
              ) : null}
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                {fourWs?.guide
                  ? `A ready-made discussion guide for “${fourWs.week.title}” — four movements to walk your group through.`
                  : "Every message comes with a guide for your group: four movements that turn Sunday into a conversation."}
              </p>
              <ul className="mt-5 space-y-2.5">
                {(movements.length > 0 ? movements : FOUR_WS).map(
                  ([name, what]) => (
                    <li key={name} className="flex gap-3 text-[0.9rem]">
                      <span className="label w-[4.5rem] shrink-0 pt-0.5 text-clay">
                        {name}
                      </span>
                      <span className="text-ink-soft">{what}</span>
                    </li>
                  ),
                )}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href={guideHref} tone="outline">
                  Get the guide
                </ButtonLink>
                <ButtonLink href="/grow/find-a-dgroup">
                  Find a Dgroup
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

/**
 * The next Sunday service, as a compact card. Moved here from the hero so the
 * hero card stays short above the fold; this section has the room for it and
 * "watch, live or any time" is where a visitor looks for the next stream.
 */
function NextServiceCard({
  next,
}: {
  next: NonNullable<Awaited<ReturnType<typeof getServiceWindow>>["next"]>;
}) {
  return (
    <CardEntrance className="w-full border border-hairline bg-paper-bright px-4 py-3 shadow-[0_18px_40px_-32px_rgba(23,21,15,0.5)] sm:min-w-72 md:max-w-xs">
      <p className="label flex items-center gap-2 text-clay">
        <PulseDot />
        Next service
      </p>
      <p className="mt-1.5 text-[0.95rem] font-semibold text-ink tabular">
        {fmtDayLong(next.starts_at)} · {fmtTime(next.starts_at)}
      </p>
      <p className="mt-0.5 text-[0.82rem] text-ink-mute">
        {fmtUntil(next.starts_at)}
        {next.venue?.name ? ` · ${next.venue.name}` : ""}
      </p>
    </CardEntrance>
  );
}

/* --- 3. Watch with CCF -----------------------------------------------------------

   Real YouTube data: the one next Sunday service, the most recent finished
   service (embeddable), the Sunday Fast Tracks, and two or three teaching
   series. Self-updating — when Sunday's stream ends it moves from "next" to
   the archive here.
--------------------------------------------------------------------------- */

function WatchWithCcf({
  sunday,
  nextService,
  series,
  fastTracks,
}: {
  sunday: SundayServices;
  nextService: Awaited<ReturnType<typeof getServiceWindow>>["next"];
  series: SeriesGroupWithVideos[];
  fastTracks: PlaylistWithVideos[];
}) {
  const next = sunday.next;
  const latestArchived = sunday.archive[0] ?? null;
  // The rest of the archive, past the one shown as an embed above.
  const earlierServices = sunday.archive.slice(1, 7);
  if (!next && !latestArchived && !series.length && !fastTracks.length)
    return null;

  return (
    <Section tone="paper" className="pb-12! sm:pb-16!">
      <Container>
        {/* Intro film leads the section — for anyone landing here who doesn't
            know CCF yet. The Sunday-stream header comes after it, with the
            service cards it actually describes. */}
        <RevealHead
          className="mx-auto max-w-2xl"
          align="center"
          eyebrow="Watch with CCF"
          icon="sparkle"
          title="A brief introduction to CCF"
          lead="If this is your first time here, this short film introduces Christ's Commission Fellowship — what we believe, how we worship, and what a Sunday looks like."
        />

        <Reveal as="div" delay={0.05} className="mt-8">
          <div className="mx-auto w-full max-w-[min(56rem,calc(82vh*16/9))] overflow-hidden border border-hairline bg-night shadow-[0_24px_60px_-45px_rgba(23,21,15,0.5)]">
            <WelcomeVideo />
          </div>
        </Reveal>

        <div className="mt-16 border-t border-hairline pt-16">
          <RevealHead
            eyebrow="The Sunday stream"
            icon="play"
            title="Sunday services, live and on demand"
            lead="CCF Centris carries the CCF-wide stream. Watch the service live, or catch any past message here — the listing updates automatically as services air and new teaching is published."
            action={
              nextService ? <NextServiceCard next={nextService} /> : undefined
            }
          />
        </div>

        <Reveal as="div" delay={0.05} className="mt-10 grid gap-8 lg:grid-cols-2">
          {next ? (
            <div className="flex flex-col border border-hairline bg-paper-bright">
              {next.videoId ? (
                <>
                  <div className="relative border-b border-hairline">
                    <YouTubeEmbed
                      videoId={next.videoId}
                      title={next.title}
                      thumbnail={next.thumbnail ?? undefined}
                      thumbnailFallback={next.thumbnailFallback ?? undefined}
                    />
                    <span className="label pointer-events-none absolute left-2 top-2 bg-night/85 px-2 py-1 text-paper-bright">
                      Upcoming service
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="label text-clay">Upcoming service</p>
                    <p className="font-display mt-1.5 text-xl leading-tight">
                      {next.title}
                    </p>
                    <p className="mt-1.5 text-[0.9rem] text-ink-soft tabular">
                      {fmtDayLong(next.scheduledFor)} · {fmtTime(next.scheduledFor)}
                    </p>
                    <p className="mt-auto pt-5 text-[0.85rem] text-ink-mute">
                      Playback begins here when the service starts.
                    </p>
                  </div>
                </>
              ) : (
                /* No stream scheduled yet — still tell the visitor when to come
                   back, rather than an empty box. */
                <div className="relative flex aspect-video w-full flex-col items-center justify-center border-b border-hairline bg-paper-deep p-6 text-center">
                  <div className="halftone pointer-events-none absolute inset-0 opacity-40" />
                  <p className="label relative text-clay">Upcoming service</p>
                  <p className="font-display relative mt-2 text-2xl leading-tight text-ink">
                    {fmtDayLong(next.scheduledFor)}
                  </p>
                  <p className="relative mt-1 text-[0.95rem] text-ink-soft tabular">
                    {fmtTime(next.scheduledFor)} · {fmtUntil(next.scheduledFor)}
                  </p>
                </div>
              )}
              {!next.videoId ? (
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-xl leading-tight">
                    {next.title}
                  </p>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">
                    The livestream appears here a day or two before the service.
                    Until then, watch last Sunday below or join the live stream
                    when it starts.
                  </p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-5">
                    <ButtonLink href="/watch/live" size="sm">
                      Watch live
                    </ButtonLink>
                    <ButtonLink href="/visit/service-times" tone="outline" size="sm">
                      Service times
                    </ButtonLink>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {latestArchived ? (
            <div className="flex flex-col border border-hairline bg-paper-bright">
              <div className="border-b border-hairline">
                <YouTubeEmbed
                  videoId={latestArchived.videoId}
                  title={latestArchived.title}
                  thumbnail={latestArchived.thumbnail}
                  thumbnailFallback={latestArchived.thumbnailFallback}
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-display text-xl leading-tight">
                  {latestArchived.title}
                </p>
                {latestArchived.servedOn ? (
                  <p className="mt-1.5 text-[0.85rem] text-ink-mute tabular">
                    {fmtDayLong(latestArchived.servedOn)}
                  </p>
                ) : null}
                <div className="mt-auto pt-5">
                  <Link
                    href={`/watch/archive/${latestArchived.videoId}`}
                    className="link label text-clay underline underline-offset-4"
                  >
                    Watch this service →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </Reveal>

        {earlierServices.length ? (
          <Reveal as="div" className="mt-16 border-t border-hairline pt-12">
            <BlockHead
              title="Earlier Sunday services"
              blurb="Every recent Sunday, ready to watch here without leaving the page."
              linkHref="/watch/archive"
              linkLabel="All Sunday services"
              icon="play"
            />
            <Stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {earlierServices.map((s) => (
                <article
                  key={s.videoId}
                  className="group flex flex-col border border-hairline bg-paper-bright"
                >
                  <Link
                    href={`/watch/archive/${s.videoId}`}
                    className="relative block aspect-video overflow-hidden border-b border-hairline"
                  >
                    <YouTubeThumb
                      src={s.thumbnail}
                      fallbackSrc={s.thumbnailFallback}
                      alt={s.title}
                    />
                    <span className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-clay text-paper-bright">
                        <PlayGlyph className="ml-0.5 h-5 w-5" />
                      </span>
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-[1.05rem] leading-tight group-hover:text-clay">
                      <Link href={`/watch/archive/${s.videoId}`}>{s.title}</Link>
                    </h3>
                    {s.servedOn ? (
                      <p className="label mt-auto pt-3 text-ink-mute tabular">
                        {fmtDayLong(s.servedOn)}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </Stagger>
          </Reveal>
        ) : null}

        {fastTracks.length ? (
          <Reveal as="div" className="mt-16 border-t border-hairline pt-12">
            <BlockHead
              title="Sunday Fast Tracks"
              blurb="Short on time? Each teaching series has a Fast Track — the Sunday message condensed to its essentials. Press play, or pick any part from the list."
              linkHref="/watch/series"
              linkLabel="All series & Fast Tracks"
              icon="message"
            />
            <Stagger className="mt-6 grid gap-6 sm:grid-cols-2">
              {fastTracks.map((p) => {
                const coverId = p.thumbnail.match(/\/vi\/([^/]+)\//)?.[1];
                return (
                  <SeriesPlayerCard
                    key={p.id}
                    kindLabel="Fast Track"
                    series={p.series}
                    playlistId={p.id}
                    playlistHref={p.href}
                    cover={p.thumbnail}
                    coverFallback={
                      coverId
                        ? `https://i.ytimg.com/vi/${coverId}/hqdefault.jpg`
                        : p.thumbnail
                    }
                    partCount={p.itemCount}
                    videos={p.videos}
                  />
                );
              })}
            </Stagger>
          </Reveal>
        ) : null}

        {series.length ? (
          <Reveal as="div" className="mt-16 border-t border-hairline pt-12">
            <BlockHead
              title="Teaching series"
              blurb="Longer journeys through a book or a theme — press play, or pick any message in the series to watch it here."
              linkHref="/watch/series"
              linkLabel="Browse all series"
              icon="sparkle"
            />
            <Stagger className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {series.map((g) => {
                const coverId = g.cover.match(/\/vi\/([^/]+)\//)?.[1];
                const playlistId = g.main?.id ?? g.companions[0]?.id ?? null;
                if (!playlistId) return null;
                return (
                  <SeriesPlayerCard
                    key={g.slug}
                    kindLabel="Teaching series"
                    series={g.series}
                    playlistId={playlistId}
                    playlistHref={
                      g.main?.href ??
                      `https://www.youtube.com/playlist?list=${playlistId}`
                    }
                    cover={g.cover}
                    coverFallback={
                      coverId
                        ? `https://i.ytimg.com/vi/${coverId}/hqdefault.jpg`
                        : g.cover
                    }
                    partCount={g.main?.itemCount || g.totalVideos}
                    videos={g.videos}
                  />
                );
              })}
            </Stagger>
          </Reveal>
        ) : null}
      </Container>
    </Section>
  );
}

/**
 * A titled sub-section header used inside the Watch section: a heading, a
 * short black-text blurb, and a "see all" link, on a rule. Keeps each shelf
 * from reading as an afterthought squeezed under the one above.
 */
function BlockHead({
  title,
  blurb,
  linkHref,
  linkLabel,
  icon,
}: {
  title: string;
  blurb: string;
  linkHref: string;
  linkLabel: string;
  icon: import("@/components/icons").IconName;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="font-display flex items-center gap-2.5 text-2xl leading-tight">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-clay">
            <SectionIcon name={icon} className="h-4 w-4" />
          </span>
          {title}
        </h3>
        <Link
          href={linkHref}
          className="link label text-clay underline underline-offset-4"
        >
          {linkLabel} →
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-ink">
        {blurb}
      </p>
    </div>
  );
}

/* --- 4. Find your people ------------------------------------------------------

   Dgroups (was "Together") and the life-stage communities, merged. Dgroups lead
   because that's CCF's first step; communities are the grid below.
---------------------------------------------------------------------------- */

function FindYourPeople({
  count,
  communities,
}: {
  count: number;
  communities: Awaited<ReturnType<typeof getCommunities>>;
}) {
  return (
    <Section tone="paper" className="relative overflow-hidden">
      <Container className="relative">
        {/* Intro: the pitch on the left, the live count as a clean inline
            stat on the right. Light ground, high contrast, no texture. */}
        <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,32rem)_1fr] lg:items-end">
          <div>
            <RevealItem as="p" className="label flex items-center gap-2.5 text-clay">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-clay/30">
                <SectionIcon name="people" className="h-3.5 w-3.5" />
              </span>
              Dgroups &amp; communities
            </RevealItem>
            <RevealItem as="h2" className="display-lg mt-5 text-ink">
              We were never meant to
              <br />
              <span className="italic text-clay">walk this road alone</span>.
            </RevealItem>
            <RevealItem as="p" className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
              A Dgroup is a small group that meets each week to open the Bible
              together, talk honestly about life, and pray for one another —
              the heart of how we grow at CCF.
            </RevealItem>
            <RevealItem className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/grow/find-a-dgroup" size="lg">
                Find a Dgroup
              </ButtonLink>
              <ButtonLink href="/grow/join-a-dgroup" tone="outline" size="lg">
                How Dgroups work →
              </ButtonLink>
            </RevealItem>
          </div>

          <Reveal className="lg:pb-1">
            <div className="flex items-baseline gap-3">
              <CountUp
                value={count}
                className="font-display block text-6xl leading-none text-clay sm:text-7xl"
              />
              <span className="label text-ink-mute">groups open now</span>
            </div>
            <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-ink-soft">
              Meeting around Centris every day of the week, every season of
              life. There&rsquo;s room for you in one of them.
            </p>
          </Reveal>
        </div>

        <div className="mt-14">
          <div className="flex items-center gap-4">
            <p className="label whitespace-nowrap text-ink-mute">
              A community for every season
            </p>
            <span aria-hidden className="h-px flex-1 bg-hairline" />
          </div>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {communities.map((c) => (
              <CommunityCard key={c.id} c={c} />
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  );
}

/* --- Court availability board ------------------------------------------------

   Today's picture for the Sports Hall courts, styled as a real booking board:
   each court is a row with a live status pill and an hour-by-hour timeline of
   the day, so a visitor can see at a glance when to turn up or reserve.
---------------------------------------------------------------------------- */

type CourtToday = Awaited<ReturnType<typeof getSportsToday>>[number];

const SLOT_STYLE: Record<string, string> = {
  available: "bg-clay/85",
  reserved: "bg-ink/15",
  pending: "bg-ink/10",
  unavailable: "bg-hairline/60",
};

function CourtRow({ court, slots, nextFree, busyUntil }: CourtToday) {
  const openNow = nextFree != null && busyUntil == null;
  const status = !nextFree
    ? { text: "Booked today", cls: "border-ink/15 text-ink-mute" }
    : openNow
      ? { text: "Open now", cls: "border-clay/40 bg-clay/10 text-clay" }
      : { text: `Opens ${fmtTime(nextFree.start)}`, cls: "border-ink/20 text-ink-soft" };

  return (
    <Link
      href="/centris/reserve"
      className="group grid items-center gap-x-5 gap-y-3 bg-paper-bright p-5 transition-colors hover:bg-bone sm:grid-cols-[13rem_1fr_auto]"
    >
      <div className="min-w-0">
        <p className="label text-ink-mute">{court.sport}</p>
        <h3 className="font-display mt-1 text-xl leading-tight">{court.name}</h3>
      </div>

      {/* Hour-by-hour timeline of the day. */}
      <div>
        <div className="flex gap-0.5">
          {slots.map((s) => (
            <span
              key={s.start}
              title={`${fmtTime(s.start)} · ${s.state}`}
              className={cx(
                "h-6 flex-1 rounded-xs first:rounded-l-md last:rounded-r-md",
                SLOT_STYLE[s.state] ?? "bg-hairline",
              )}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[0.7rem] text-ink-mute tabular">
          <span>{slots.length ? fmtTime(slots[0].start) : ""}</span>
          <span>{slots.length ? fmtTime(slots[slots.length - 1].end) : ""}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
        <span
          className={cx(
            "label whitespace-nowrap border px-2.5 py-1",
            status.cls,
          )}
        >
          {status.text}
        </span>
        <span className="label text-clay opacity-0 transition-opacity group-hover:opacity-100">
          Reserve →
        </span>
      </div>
    </Link>
  );
}

function CourtBoard({ courts }: { courts: CourtToday[] }) {
  const openCount = courts.filter(
    (c) => c.nextFree != null && c.busyUntil == null,
  ).length;

  return (
    <div className="border border-hairline bg-paper-bright shadow-[0_24px_60px_-45px_rgba(23,21,15,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-5">
        <div>
          <p className="label flex items-center gap-2 text-clay">
            <PulseDot />
            Play at Centris today
          </p>
          <p className="mt-1.5 text-[0.9rem] text-ink-soft">
            {openCount > 0
              ? `${openCount} of ${courts.length} courts open right now.`
              : "Every court is booked for now — reserve a later slot."}{" "}
            Basketball, badminton, and pickleball.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/centris/availability" tone="outline">
            Check availability
          </ButtonLink>
          <ButtonLink href="/centris/reserve">Reserve a court</ButtonLink>
        </div>
      </div>

      <div className="grid gap-px bg-hairline">
        {courts.map((c) => (
          <CourtRow key={c.court.id} {...c} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline px-5 py-3 text-[0.72rem] text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-clay/85" /> Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-ink/15" /> Reserved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-hairline/60" /> Past / closed
        </span>
      </div>
    </div>
  );
}

/* --- 6. Around Centris ----------------------------------------------------------

   "Explore the center" and the sports courts, merged. Facilities grid, then a
   compact strip of today's court availability.
---------------------------------------------------------------------------- */

function TheCenter({
  courts,
}: {
  courts: Awaited<ReturnType<typeof getSportsToday>>;
}) {
  const shownCourts = courts.slice(0, 4);
  const setups = [
    ["class", "Class"],
    ["table", "Table"],
    ["furniture", "Furniture"],
  ] as const;

  return (
    <Section tone="bright">
      <Container>
        <RevealHead
          eyebrow="Around CCF Centris"
          icon="building"
          title="What’s where"
          lead="Everything is on the second floor of Centris Station: rooms for classes, Dgroups, and gatherings, and a sports court. Seats are listed for each way a room can be set up."
        />

        <Reveal as="div" className="mt-10 overflow-x-auto border border-hairline bg-paper">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <caption className="sr-only">
              Rooms at CCF Centris and how many people each seats per setup
            </caption>
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="label px-5 py-3 text-ink-mute">
                  Room
                </th>
                {setups.map(([key, label]) => (
                  <th
                    key={key}
                    scope="col"
                    className="label px-5 py-3 text-right text-ink-mute"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROOMS.map((room) => (
                <tr key={room.slug} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className="px-5 py-4 align-top font-normal">
                    {room.href ? (
                      <Link
                        href={room.href}
                        className="font-display text-lg leading-tight text-ink transition-colors hover:text-clay"
                      >
                        {room.name}
                      </Link>
                    ) : (
                      <span className="font-display text-lg leading-tight text-ink">
                        {room.name}
                      </span>
                    )}
                    <span className="mt-1 block max-w-md text-[0.85rem] leading-snug text-ink-mute">
                      {room.blurb}
                    </span>
                  </th>
                  {setups.map(([key]) => (
                    <td
                      key={key}
                      className="tabular px-5 py-4 text-right align-top text-[1.05rem] text-ink"
                    >
                      {room.capacity[key] ?? (
                        <span className="text-ink-mute" aria-label="not offered">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="mt-3 text-[0.82rem] leading-relaxed text-ink-mute">
          Class: rows of chairs facing the front. Table: groups seated around
          tables. Furniture: the room&rsquo;s own lounge seating.
        </p>

        {shownCourts.length ? (
          <Reveal as="div" className="mt-12">
            <CourtBoard courts={shownCourts} />
          </Reveal>
        ) : null}
      </Container>
    </Section>
  );
}

/* --- 5. Serve ------------------------------------------------------------------ */

function Serve({
  roles,
}: {
  roles: Awaited<ReturnType<typeof getVolunteerRoles>>;
}) {
  return (
    <Section tone="deep">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="relative border-l-2 border-clay pl-6 sm:pl-8">
            <RevealItem as="p" className="label flex items-center gap-2.5 text-ink-mute">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current/25">
                <SectionIcon name="hands" className="h-3.5 w-3.5" />
              </span>
              Serve
            </RevealItem>
            <RevealItem as="h2" className="display-md mt-5">
              There&rsquo;s a place for you on a team.
            </RevealItem>
            <RevealItem as="p" className="mt-5 max-w-lg leading-relaxed text-ink-soft">
              Every Sunday is carried by people who serve — welcoming guests at
              the door, caring for children in NXTGEN, running production, leading
              on the courts, praying with those who stay. Most people start by
              trying one team for a season and seeing where they fit.
            </RevealItem>
            <RevealItem className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/serve">Find a place to serve</ButtonLink>
              <Link
                href="/serve/at-centris"
                className="link label text-clay underline underline-offset-4 hover:text-clay-deep"
              >
                Teams at Centris &rarr;
              </Link>
            </RevealItem>
          </div>

          <Stagger className="grid grid-cols-1 gap-px border border-hairline bg-hairline shadow-[0_24px_60px_-45px_rgba(23,21,15,0.5)] min-[440px]:grid-cols-2">
            {roles.slice(0, 8).map((r) => (
              <Link
                key={r.id}
                href={`/serve/${r.slug}`}
                className="group flex h-full flex-col justify-between bg-paper-bright p-5 transition-colors hover:bg-bone"
              >
                <span className="font-display text-lg leading-tight group-hover:text-clay">
                  {r.title}
                </span>
                <span className="label mt-4 text-ink-mute">{r.ministry}</span>
              </Link>
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  );
}

/* --- 7. Where we are --------------------------------------------------------- */

function WhereWeAre() {
  return (
    <Section tone="paper">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <RevealItem as="p" className="label flex items-center gap-2.5 text-ink-mute">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current/25">
                <SectionIcon name="pin" className="h-3.5 w-3.5" />
              </span>
              Where we are
            </RevealItem>
            <RevealItem as="h2" className="display-md mt-5">
              Right off the MRT at Quezon Avenue.
            </RevealItem>
            <RevealItem as="div">
              <address className="font-display mt-6 text-2xl not-italic leading-snug sm:text-3xl">
                {SITE.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
            </RevealItem>
            <RevealItem as="p" className="mt-5 max-w-md leading-relaxed text-ink-soft">
              Centris Station connects directly to MRT-3 Quezon Avenue. Walk
              through the concourse into Eton Centris and take the escalator to
              the second floor. Parking is available on site if you&rsquo;re
              driving.
            </RevealItem>
            <RevealItem className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/visit/directions">Full directions</ButtonLink>
              <a
                href={MAPS_LINK}
                target="_blank"
                rel="noreferrer"
                className="btn-press label inline-flex items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
              >
                Open in maps
              </a>
            </RevealItem>
          </div>

          <Reveal as="div" delay={0.08} className="border border-hairline bg-paper">
            <iframe
              title="Map showing CCF Centris at Eton Centris, Quezon City"
              src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[4/3] w-full"
            />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

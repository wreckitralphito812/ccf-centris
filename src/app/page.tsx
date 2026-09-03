import Link from "next/link";
import {
  getCommunities,
  getLatestMessage,
  getServiceWindow,
  getFacilities,
  getSportsToday,
  getVolunteerRoles,
} from "@/lib/queries";
import { findDgroups } from "@/lib/queries";
import { manilaDateKey, fmtDayLong, fmtTime } from "@/lib/format";
import { SITE, MAPS_LINK } from "@/lib/site";
import {
  ButtonLink,
  Container,
  Eyebrow,
  LiveDot,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { CommunityCard, MessageArt } from "@/components/cards";
import { HeroBackdrop } from "@/components/hero-backdrop";
import {
  CountUp,
  HeroStage,
  HoverLift,
  Reveal,
  Stagger,
} from "@/components/motion";
import { CcfPhoto } from "@/components/ccf-photo";
import { CcfMark } from "@/components/wordmark";
import { YouTubeThumb } from "@/components/youtube-thumb";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { CCF_STILLS, ytThumb } from "@/lib/ccf-stills";
import { getSundayServices, type SundayServices } from "@/lib/services";
import { getFeaturedSeries } from "@/lib/channel";
import type { SeriesGroup } from "@/lib/channel";

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
  const [window, latest, communities, facilities, roles] =
    await Promise.all([
      getServiceWindow(),
      getLatestMessage(),
      getCommunities(),
      getFacilities(),
      getVolunteerRoles(),
    ]);

  // Live from CCF's YouTube channel, revalidated on an interval.
  const [sunday, featuredSeries] = await Promise.all([
    getSundayServices(),
    getFeaturedSeries(3),
  ]);

  const today = manilaDateKey();
  const courts = await getSportsToday(today);
  const dgroups = await findDgroups({});

  const isLive = window.current !== null;

  return (
    <>
      <Welcome
        live={isLive}
        next={window.next}
        current={window.current}
      />

      <WatchWithCcf sunday={sunday} series={featuredSeries} />

      <SundayMessage latest={latest} dgroupCount={dgroups.length} />

      <FindYourPeople count={dgroups.length} communities={communities} />

      <Serve roles={roles} />

      <TheCenter facilities={facilities} courts={courts} />

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
  next,
  current,
}: {
  live: boolean;
  next: Awaited<ReturnType<typeof getServiceWindow>>["next"];
  current: Awaited<ReturnType<typeof getServiceWindow>>["current"];
}) {
  return (
    <section className="relative flex min-h-[calc(100svh-var(--chrome,4rem))] items-center overflow-hidden bg-paper-deep sm:h-[calc(100svh-var(--chrome,4rem))]">
      {/* Full-bleed CCF worship photo behind the whole hero. */}
      <HeroBackdrop poster="/photos/hero-welcome.jpg" />
      <Container wide className="relative w-full py-8">
        {/* Copy sits on its own paper card so it holds against the photo. Its
            lines arrive top-to-bottom on load via HeroStage. */}
        <HeroStage className="relative max-w-xl border border-hairline bg-paper-bright/95 p-6 shadow-[0_30px_80px_-40px_rgba(23,21,15,0.6)] backdrop-blur-sm sm:max-w-2xl sm:p-8">
            {live ? (
              <Link
                href="/watch/live"
                className="label inline-flex items-center gap-2 bg-clay px-3 py-1.5 text-paper-bright"
              >
                <LiveDot />
                We&rsquo;re worshipping live right now
              </Link>
            ) : (
              /* The mark leads the eyebrow, so CCF is identified before the
                 center name in the headline below. */
              <div className="flex items-center gap-3">
                <CcfMark className="h-9 w-9 text-clay" />
                <Eyebrow rule={false}>
                  Christ&rsquo;s Commission Fellowship
                </Eyebrow>
              </div>
            )}

            <h1 className="display-xl mt-5">
              Welcome to
              <br />
              <span className="italic text-clay">CCF Centris</span>
            </h1>

            <p className="font-script mt-3 text-3xl text-ink-soft sm:text-4xl">
              worship, grow, connect, serve
            </p>

            {/* CCF's own welcome line, quoted verbatim from ccf.org.ph. */}
            <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
              Regardless of who you are or where life has taken you, you are more
              than welcome here. We&rsquo;d love to meet you this Sunday at our
              new center on the second floor of Centris Station, right off the
              MRT.
            </p>

            {/* Worshipping with us — online first — is the one clear primary.
                Service times is the strong secondary; Dgroups is a quiet text
                link so the pair of buttons reads at a glance. */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="/watch/live" size="lg">
                {live ? "Join the live service" : "Worship with us online"}
              </ButtonLink>
              <ButtonLink href="/visit/service-times" tone="outline" size="lg">
                See service times
              </ButtonLink>
              <Link
                href="/grow/find-a-dgroup"
                className="link label ml-1 text-clay underline underline-offset-4 hover:text-clay-deep"
              >
                Find a Dgroup &rarr;
              </Link>
            </div>

            <ServiceLine live={live} next={next} current={current} />
          </HeroStage>
      </Container>
    </section>
  );
}

/** One quiet line under the hero buttons: live now, or the next service. */
function ServiceLine({
  live,
  next,
  current,
}: {
  live: boolean;
  next: Awaited<ReturnType<typeof getServiceWindow>>["next"];
  current: Awaited<ReturnType<typeof getServiceWindow>>["current"];
}) {
  if (live && current) {
    return (
      <p className="mt-5 border-t border-hairline pt-4 text-[0.95rem] text-ink-soft">
        <span className="label mr-2 text-clay">On now</span>
        {current.title}
        {current.speaker ? ` with ${current.speaker.name}` : ""} &middot;{" "}
        {current.venue?.name}
      </p>
    );
  }

  if (!next) return null;

  return (
    <p className="mt-5 border-t border-hairline pt-4 text-[0.95rem] text-ink-soft">
      <span className="label mr-2 text-clay">Next service</span>
      <span className="font-semibold text-ink">
        {fmtDayLong(next.starts_at)}, {fmtTime(next.starts_at)}
      </span>{" "}
      &middot; {next.venue?.name}
      {next.nxtgen_available ? " · NXTGEN meets alongside" : ""}
    </p>
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

/* --- 2. Sunday's message ------------------------------------------------------

   The seeded "latest message" feature. The right-hand rail carries the message
   forward into a Dgroup — the 4Ws guide for this week, then the invitation to
   discuss it with a group. Listing other recent messages here would only repeat
   "Watch with CCF" below, which already covers the Sunday archive.
---------------------------------------------------------------------------- */

function SundayMessage({
  latest,
  dgroupCount,
}: {
  latest: Awaited<ReturnType<typeof getLatestMessage>>;
  dgroupCount: number;
}) {
  if (!latest) return null;
  return (
    <Section tone="bright">
      <Container>
        <Reveal>
          <SectionHead
            eyebrow="Sunday's message"
            title="Pick up where Sunday left off"
            lead="Missed a week, or want to sit with the message again? Every teaching is here to watch, with a 4Ws guide for your Dgroup."
            action={
              <ButtonLink href="/watch/messages" tone="outline">
                All messages
              </ButtonLink>
            }
          />
        </Reveal>

        <Reveal
          as="div"
          delay={0.05}
          className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]"
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
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay text-2xl text-paper-bright">
                    ▶
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
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={`/watch/messages/${latest.slug}`}>
                  Watch the message
                </ButtonLink>
                <ButtonLink
                  href={`/watch/messages/${latest.slug}#four-ws`}
                  tone="outline"
                >
                  Get the 4Ws guide
                </ButtonLink>
                <ButtonLink href="/grow/find-a-dgroup" tone="ghost">
                  Talk it through in a Dgroup →
                </ButtonLink>
              </div>
            </div>
          </article>

          <div>
            <p className="label text-ink-mute">Take it further</p>
            <Stagger className="mt-4 space-y-5">
              <div className="border border-hairline bg-paper p-6">
                <p className="font-display text-2xl leading-tight">
                  The 4Ws for this week
                </p>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                  {latest.four_ws
                    ? "A ready-made discussion guide for this message — four movements to walk your group through."
                    : "Every message comes with a guide for your group: four movements that turn Sunday into a conversation."}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {FOUR_WS.map(([name, what]) => (
                    <li key={name} className="flex gap-3 text-[0.9rem]">
                      <span className="label w-[4.5rem] shrink-0 pt-0.5 text-clay">
                        {name}
                      </span>
                      <span className="text-ink-soft">{what}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <ButtonLink
                    href={`/watch/messages/${latest.slug}#four-ws`}
                    tone="outline"
                  >
                    Get the guide
                  </ButtonLink>
                </div>
              </div>

              <div className="border border-hairline bg-paper-deep p-6">
                <p className="font-display text-2xl leading-tight">
                  Don&rsquo;t process it alone
                </p>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                  A Dgroup is a handful of people working through the same
                  message together, week to week.
                </p>
                {dgroupCount > 0 ? (
                  <p className="mt-4 text-[0.9rem] text-ink-mute">
                    <span className="font-display text-3xl text-ink">
                      {dgroupCount}
                    </span>{" "}
                    groups are open right now.
                  </p>
                ) : null}
                <div className="mt-5">
                  <ButtonLink href="/grow/find-a-dgroup">
                    Find a Dgroup
                  </ButtonLink>
                </div>
              </div>
            </Stagger>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

/* --- 3. Watch with CCF -----------------------------------------------------------

   Real YouTube data: the one next Sunday service, the most recent finished
   service (embeddable), and two or three teaching series. Self-updating —
   when Sunday's stream ends it moves from "next" to the archive here.
--------------------------------------------------------------------------- */

function WatchWithCcf({
  sunday,
  series,
}: {
  sunday: SundayServices;
  series: SeriesGroup[];
}) {
  const next = sunday.next;
  const latestArchived = sunday.archive[0] ?? null;
  if (!next && !latestArchived && !series.length) return null;

  return (
    <Section tone="paper">
      <Container>
        <Reveal>
          <SectionHead
            eyebrow="Watch with CCF"
            title="Sunday, live or any time"
            lead="CCF Centris shares the CCF-wide stream. Play any service right here — this updates on its own as services air and new teaching is published."
          />
        </Reveal>

        <Reveal as="div" delay={0.05} className="mt-10 grid gap-8 lg:grid-cols-2">
          {next ? (
            <div className="flex flex-col border border-hairline bg-paper-bright">
              <div className="relative border-b border-hairline">
                {next.videoId ? (
                  <YouTubeEmbed
                    videoId={next.videoId}
                    title={next.title}
                    thumbnail={next.thumbnail ?? undefined}
                    thumbnailFallback={next.thumbnailFallback ?? undefined}
                  />
                ) : (
                  <div className="halftone aspect-video w-full bg-paper-deep" />
                )}
                <span className="label pointer-events-none absolute left-2 top-2 bg-night/85 px-2 py-1 text-paper-bright">
                  Next service
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-display text-xl leading-tight">
                  {next.title}
                </p>
                <p className="mt-1.5 text-[0.9rem] text-ink-soft tabular">
                  {fmtDayLong(next.scheduledFor)} · {fmtTime(next.scheduledFor)}
                </p>
                <p className="mt-auto pt-5 text-[0.85rem] text-ink-mute">
                  The stream starts here when the service begins.
                </p>
              </div>
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
                <p className="label text-clay">Most recent service</p>
                <p className="font-display mt-1.5 text-xl leading-tight">
                  {latestArchived.title}
                </p>
                {latestArchived.servedOn ? (
                  <p className="mt-1.5 text-[0.85rem] text-ink-mute tabular">
                    {fmtDayLong(latestArchived.servedOn)}
                  </p>
                ) : null}
                <div className="mt-auto pt-5">
                  <Link
                    href="/watch/archive"
                    className="link label text-clay underline underline-offset-4"
                  >
                    All Sunday services →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </Reveal>

        {series.length ? (
          <Reveal as="div" className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="label text-ink-mute">Teaching series</p>
              <Link
                href="/watch/series"
                className="link label text-clay underline underline-offset-4"
              >
                Browse all series →
              </Link>
            </div>
            <Stagger className="mt-5 grid gap-5 sm:grid-cols-3">
              {series.map((g) => {
                const coverId = g.cover.match(/\/vi\/([^/]+)\//)?.[1];
                return (
                  <Link
                    key={g.slug}
                    href="/watch/series"
                    className="group flex flex-col border border-hairline bg-paper-bright"
                  >
                    <div className="relative aspect-video overflow-hidden border-b border-hairline">
                      {g.cover ? (
                        <YouTubeThumb
                          src={g.cover}
                          fallbackSrc={
                            coverId
                              ? `https://i.ytimg.com/vi/${coverId}/hqdefault.jpg`
                              : g.cover
                          }
                          alt={g.series}
                        />
                      ) : (
                        <span className="halftone block h-full w-full bg-paper-deep" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="font-display text-[1.02rem] leading-tight group-hover:text-clay">
                        {g.series}
                      </p>
                      <p className="label mt-auto pt-3 text-ink-mute tabular">
                        {g.main?.itemCount ?? g.totalVideos} videos
                      </p>
                    </div>
                  </Link>
                );
              })}
            </Stagger>
          </Reveal>
        ) : null}
      </Container>
    </Section>
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
    <Section tone="ink" className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(#f4efe6 1px, transparent 1.2px)",
          backgroundSize: "9px 9px",
        }}
      />
      <Container className="relative">
        <Reveal className="max-w-2xl">
          <Eyebrow tone="paper">Dgroups & communities</Eyebrow>
          <h2 className="display-lg mt-5">
            We were never meant to
            <br />
            <span className="italic text-clay-lift">walk this road alone</span>.
          </h2>
          <p className="mt-6 text-[1.05rem] leading-relaxed text-paper-bright/70">
            A Dgroup is a small group that meets each week to open the Bible
            together, talk honestly about life, and pray for one another.
            It&rsquo;s the heart of how we grow at CCF — real friendships with
            people committed to following Christ.
          </p>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-paper-bright/70">
            There are{" "}
            <CountUp
              value={count}
              className="font-display text-clay-lift"
              suffix=" groups"
            />{" "}
            meeting around Centris right now, on every day of the week and in
            every season of life. There&rsquo;s room for you in one of them.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/grow/find-a-dgroup" size="lg" tone="on-dark">
              Find a Dgroup
            </ButtonLink>
            <ButtonLink
              href="/grow/join-a-dgroup"
              tone="ghost-on-dark"
              size="lg"
            >
              How Dgroups work →
            </ButtonLink>
          </div>
        </Reveal>

        <div className="mt-14">
          <p className="label text-paper-bright/60">
            Communities for every season
          </p>
          <Stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {communities.map((c) => (
              <CommunityCard key={c.id} c={c} />
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  );
}

/* --- 6. Around Centris ----------------------------------------------------------

   "Explore the center" and the sports courts, merged. Facilities grid, then a
   compact strip of today's court availability.
---------------------------------------------------------------------------- */

function TheCenter({
  facilities,
  courts,
}: {
  facilities: Awaited<ReturnType<typeof getFacilities>>;
  courts: Awaited<ReturnType<typeof getSportsToday>>;
}) {
  const featured = facilities.filter((f) =>
    [
      "main-worship-hall",
      "sports-hall",
      "multipurpose-hall-1",
      "dgroup-lounge",
    ].includes(f.slug),
  );
  const shownCourts = courts.slice(0, 4);

  // A CCF still for each featured space, keyed by slug.
  const facilityStill: Record<string, string> = {
    "main-worship-hall": CCF_STILLS.shepherd,
    "sports-hall": CCF_STILLS.care,
    "multipurpose-hall-1": CCF_STILLS.grow,
    "dgroup-lounge": CCF_STILLS.faithfulness,
  };

  return (
    <Section tone="bright">
      <Container>
        <Reveal>
          <SectionHead
            eyebrow="Around CCF Centris"
            title="Room to gather, to learn, and to play"
            lead="A worship hall that seats 1,300, a sports hall for 800, four flexible halls for classes and events, and a lounge made for Dgroups — and the sports hall is open to the neighborhood, not only to CCF."
            action={
              <ButtonLink href="/centris" tone="outline">
                Take a look around
              </ButtonLink>
            }
          />
        </Reveal>

        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((f) => (
            <HoverLift key={f.id}>
              <Link
                href={`/centris/facilities/${f.slug}`}
                className="group block border border-hairline bg-paper transition-colors hover:border-ink"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <CcfPhoto
                    src={ytThumb(facilityStill[f.slug] ?? CCF_STILLS.shepherd)}
                    seed={f.slug}
                    label={f.name}
                    alt={f.name}
                    className="h-full w-full"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg leading-tight">
                    {f.name}
                  </h3>
                  {f.capacity ? (
                    <p className="mt-1 text-[0.82rem] text-ink-mute">
                      Seats{" "}
                      <CountUp value={f.capacity} className="tabular" />
                    </p>
                  ) : null}
                </div>
              </Link>
            </HoverLift>
          ))}
        </Stagger>

        {shownCourts.length ? (
          <Reveal
            as="div"
            className="mt-12 border border-hairline bg-paper-bright"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-5">
              <div>
                <p className="label text-clay">Play at Centris today</p>
                <p className="mt-1 text-[0.9rem] text-ink-soft">
                  Basketball, badminton, and pickleball. Reserve a court, or drop
                  in on an open night.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/centris/availability" tone="outline">
                  Check availability
                </ButtonLink>
                <ButtonLink href="/centris/reserve">Reserve a court</ButtonLink>
              </div>
            </div>
            <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              {shownCourts.map(({ court, nextFree, busyUntil }) => (
                <div key={court.id} className="bg-paper-bright p-5">
                  <p className="label text-ink-mute">{court.sport}</p>
                  <h3 className="font-display mt-1.5 text-xl">{court.name}</h3>
                  {nextFree ? (
                    <>
                      <p className="mt-4 text-[0.82rem] text-ink-mute">
                        {busyUntil ? "Next open" : "Open now"}
                      </p>
                      <p className="font-display text-2xl text-moss tabular">
                        {fmtTime(nextFree.start)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-[0.82rem] text-ink-mute">Today</p>
                      <p className="font-display text-2xl text-ink-mute">
                        Fully booked
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
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
          <Reveal className="relative border-l-2 border-clay pl-6 sm:pl-8">
            <Eyebrow>Serve</Eyebrow>
            <h2 className="display-md mt-5">
              There&rsquo;s a place for you on a team.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-ink-soft">
              Every Sunday is carried by people who serve — welcoming guests at
              the door, caring for children in NXTGEN, running production, leading
              on the courts, praying with those who stay. Most people start by
              trying one team for a season and seeing where they fit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/serve">Find a place to serve</ButtonLink>
              <Link
                href="/serve/at-centris"
                className="link label text-clay underline underline-offset-4 hover:text-clay-deep"
              >
                Teams at Centris &rarr;
              </Link>
            </div>
          </Reveal>

          <Stagger className="grid grid-cols-2 gap-px border border-hairline bg-hairline shadow-[0_24px_60px_-45px_rgba(23,21,15,0.5)]">
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
          <Reveal>
            <Eyebrow>Where we are</Eyebrow>
            <h2 className="display-md mt-5">
              Right off the MRT at Quezon Avenue.
            </h2>
            <address className="font-display mt-6 text-2xl not-italic leading-snug sm:text-3xl">
              {SITE.addressLines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
              Centris Station connects directly to MRT-3 Quezon Avenue. Walk
              through the concourse into Eton Centris and take the escalator to
              the second floor. Parking is available on site if you&rsquo;re
              driving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/visit/directions">Full directions</ButtonLink>
              <a
                href={MAPS_LINK}
                target="_blank"
                rel="noreferrer"
                className="btn-press label inline-flex items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
              >
                Open in maps
              </a>
            </div>
          </Reveal>

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

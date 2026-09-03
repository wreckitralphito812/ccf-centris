import Link from "next/link";
import {
  getCommunities,
  getLatestMessage,
  getMessages,
  getServiceWindow,
  getUpcomingEvents,
  getFacilities,
  getSportsToday,
  getVolunteerRoles,
} from "@/lib/queries";
import { findDgroups } from "@/lib/queries";
import { manilaDateKey, fmtDayLong, fmtTime, fmtPeso } from "@/lib/format";
import { SITE, MAPS_LINK } from "@/lib/site";
import {
  Button,
  ButtonLink,
  Container,
  Eyebrow,
  LiveDot,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import {
  CommunityCard,
  EventCard,
  MessageArt,
  MessageCard,
} from "@/components/cards";
import { Countdown } from "@/components/service-status";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { getBackgroundVideos, getLatestServiceVideo } from "@/lib/youtube";
import type { ChannelVideo } from "@/lib/youtube";

export default async function HomePage() {
  const [window, latest, messages, events, communities, facilities, roles] =
    await Promise.all([
      getServiceWindow(),
      getLatestMessage(),
      getMessages(),
      getUpcomingEvents(6),
      getCommunities(),
      getFacilities(),
      getVolunteerRoles(),
    ]);

  // Live from CCF's YouTube channel, revalidated on an interval.
  const [backdrop, latestVideo] = await Promise.all([
    getBackgroundVideos(5),
    getLatestServiceVideo(),
  ]);

  const today = manilaDateKey();
  const courts = await getSportsToday(today);
  const dgroups = await findDgroups({});

  const isLive = window.current !== null;

  return (
    <>
      <Hero
        live={isLive}
        next={window.next}
        current={window.current}
        backdrop={backdrop}
      />

      <NextUp window={window} live={isLive} />

      <NewHere />

      <ThisWeek events={events} />

      <LatestTeaching latest={latest} recent={messages.slice(1, 4)} />

      <FromTheChannel latest={latestVideo} />

      <Together count={dgroups.length} />

      <Communities communities={communities} />

      <ExploreCenter facilities={facilities} />

      <PlayAtCentris courts={courts} />

      <Serve roles={roles} />

      <FindUs />
    </>
  );
}

/* --- Hero ------------------------------------------------------------------- */

function Hero({
  live,
  next,
  current,
  backdrop,
}: {
  live: boolean;
  next: Awaited<ReturnType<typeof getServiceWindow>>["next"];
  current: Awaited<ReturnType<typeof getServiceWindow>>["current"];
  backdrop: ChannelVideo[];
}) {
  return (
    <section className="relative overflow-hidden bg-paper-deep">
      <HeroBackdrop videos={backdrop} />
      <Container wide className="relative py-16 sm:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            {live ? (
              <Link
                href="/watch/live"
                className="label inline-flex items-center gap-2 bg-clay px-3 py-1.5 text-paper-bright"
              >
                <LiveDot />
                CCF Centris is live
              </Link>
            ) : (
              <Eyebrow>Christ&rsquo;s Commission Fellowship</Eyebrow>
            )}

            <h1 className="display-xl mt-6">
              Welcome to
              <br />
              <span className="italic text-clay">CCF Centris</span>
            </h1>

            <p className="font-script mt-4 text-3xl text-ink-soft sm:text-4xl">
              worship, grow, connect, serve
            </p>

            {/* CCF's own welcome line, from ccf.org.ph. */}
            <p className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
              Regardless of who you are or where life has taken you, you are
              more than welcome here. A new CCF center on the second floor of
              Centris Station, right off the MRT.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/visit/plan" size="lg">
                Plan your visit
              </ButtonLink>
              <ButtonLink href="/watch/live" tone="outline" size="lg">
                {live ? "Watch live now" : "Watch online"}
              </ButtonLink>
              <ButtonLink href="/grow/find-a-dgroup" tone="ghost" size="lg">
                Join a Dgroup →
              </ButtonLink>
            </div>
          </div>

          {/* Collage panel. Taped photo stand-ins, no stock imagery. */}
          <div className="relative hidden lg:block">
            <div className="taped relative ml-auto w-[85%] rotate-[-1.5deg] border border-hairline bg-paper-bright p-2.5 shadow-[0_20px_50px_-30px_rgba(23,21,15,0.6)]">
              <MessageArt seed="hero-worship" label="Sunday" className="aspect-[4/5] w-full" />
              <p className="font-script mt-2 text-center text-xl text-ink-soft">
                see you Sunday
              </p>
            </div>
            <div className="absolute -bottom-6 left-0 w-[52%] rotate-[3deg] border border-hairline bg-paper-bright p-2 shadow-[0_16px_40px_-28px_rgba(23,21,15,0.6)]">
              <MessageArt seed="hero-sports" label="Play" className="aspect-[4/3] w-full" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* --- Context-aware service band --------------------------------------------- */

function NextUp({
  window,
  live,
}: {
  window: Awaited<ReturnType<typeof getServiceWindow>>;
  live: boolean;
}) {
  if (live && window.current) {
    const s = window.current;
    return (
      <section className="bg-clay text-paper-bright">
        <Container className="py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="label flex items-center gap-2">
                <LiveDot />
                Live now
              </p>
              <h2 className="display-md mt-3">{s.title}</h2>
              <p className="mt-2 text-paper-bright/80">
                {s.speaker?.name}
                {s.series ? ` · ${s.series.title}` : ""} · {s.venue?.name}
              </p>
            </div>
            <ButtonLink
              href="/watch/live"
              size="lg"
              className="border-paper-bright bg-paper-bright text-clay hover:bg-bone hover:border-bone"
            >
              Watch the stream
            </ButtonLink>
          </div>
        </Container>
      </section>
    );
  }

  const s = window.next;
  if (!s) return null;

  return (
    <section className="border-y border-hairline bg-paper-bright">
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <div>
              <Eyebrow>Next worship service</Eyebrow>
              <p className="font-display mt-3 text-4xl leading-none sm:text-5xl">
                {fmtTime(s.starts_at)}
              </p>
              <p className="mt-2 text-[0.95rem] text-ink-soft">
                {fmtDayLong(s.starts_at)} · {s.venue?.name}
              </p>
            </div>
            <div className="border-l border-hairline pl-8">
              <p className="label text-ink-mute">Starts in</p>
              <p className="mt-2 text-3xl text-clay">
                <Countdown target={s.starts_at} />
              </p>
              {s.nxtgen_available ? (
                <p className="mt-2 text-[0.85rem] text-ink-mute">
                  NXTGEN runs alongside this service
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/visit/plan">Plan your visit</ButtonLink>
            <ButtonLink href="/visit/directions" tone="outline">
              Directions
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* --- New here ---------------------------------------------------------------- */

function NewHere() {
  const steps = [
    {
      n: "01",
      title: "Arrive a little early",
      body: "Come 15 minutes before the service. Someone at the Welcome Center will meet you and walk you in.",
    },
    {
      n: "02",
      title: "Bring the kids",
      body: "NXTGEN check-in opens 30 minutes before each service, on the same floor. Or keep them with you.",
    },
    {
      n: "03",
      title: "Stay after",
      body: "The prayer team is at the front and the Dgroup desk is open. No pressure, no sign-up sheet.",
    },
  ];

  return (
    <Section tone="paper">
      <Container>
        <SectionHead
          eyebrow="New here?"
          title={
            <>
              Everything you need for your{" "}
              <span className="underlined">first Sunday</span>.
            </>
          }
          lead="You do not need to register, dress a certain way, or know anyone. Come as you are and leave with as many questions as you arrived with."
          action={<ButtonLink href="/visit/new-here">Start here</ButtonLink>}
        />

        <div className="mt-12 grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-paper-bright p-7">
              <p className="font-display text-5xl leading-none text-clay/25">{s.n}</p>
              <h3 className="font-display mt-5 text-xl">{s.title}</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* --- This week --------------------------------------------------------------- */

function ThisWeek({ events }: { events: Awaited<ReturnType<typeof getUpcomingEvents>> }) {
  if (!events.length) return null;
  return (
    <Section tone="deep">
      <Container>
        <SectionHead
          eyebrow="This week at Centris"
          title="What's on"
          action={<ButtonLink href="/events" tone="outline">All events</ButtonLink>}
        />
        <div className="no-bar mt-10 flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {events.map((e) => (
            <div key={e.id} className="w-[19rem] shrink-0 sm:w-auto">
              <EventCard e={e} />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* --- Teaching ---------------------------------------------------------------- */

function LatestTeaching({
  latest,
  recent,
}: {
  latest: Awaited<ReturnType<typeof getLatestMessage>>;
  recent: Awaited<ReturnType<typeof getMessages>>;
}) {
  if (!latest) return null;
  return (
    <Section tone="paper">
      <Container>
        <SectionHead
          eyebrow="Latest message"
          title="Continue Sunday's message"
          action={<ButtonLink href="/watch/messages" tone="outline">All messages</ButtonLink>}
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <article>
            <Link href={`/watch/messages/${latest.slug}`} className="group block">
              <div className="aspect-[16/9] overflow-hidden border border-hairline">
                <MessageArt
                  seed={latest.slug}
                  label={latest.series?.title}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </Link>
            <div className="mt-5">
              {latest.series ? <Pill tone="clay">{latest.series.title}</Pill> : null}
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
                <ButtonLink href={`/watch/messages/${latest.slug}`}>Watch</ButtonLink>
                <ButtonLink href={`/watch/messages/${latest.slug}#four-ws`} tone="outline">
                  Download 4Ws
                </ButtonLink>
                <ButtonLink href="/grow/find-a-dgroup" tone="ghost">
                  Discuss in a Dgroup →
                </ButtonLink>
              </div>
            </div>
          </article>

          <div className="space-y-8">
            <p className="label text-ink-mute">Also recently</p>
            {recent.map((m) => (
              <MessageCard key={m.id} m={m} compact />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --- Live from the CCF channel ----------------------------------------------- */

/**
 * Pulled live from CCF's YouTube channel rather than seeded, so the site
 * reflects whatever was published most recently without a rebuild.
 */
function FromTheChannel({ latest }: { latest: ChannelVideo | null }) {
  if (!latest) return null;

  return (
    <Section tone="bright">
      <Container>
        <SectionHead
          eyebrow="Straight from the CCF channel"
          title="Most recent from CCF"
          lead="CCF Centris shares the CCF-wide stream. This updates automatically as new services and messages are published."
          action={
            <a
              href="https://www.youtube.com/@CCFmainTV"
              target="_blank"
              rel="noreferrer"
              className="label inline-flex items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
            >
              Visit the channel
            </a>
          }
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <a
            href={latest.href}
            target="_blank"
            rel="noreferrer"
            className="group relative block aspect-video overflow-hidden border border-hairline"
          >
            <img
              src={latest.thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-clay text-2xl text-paper-bright transition-transform duration-300 group-hover:scale-110">
                ▶
              </span>
            </span>
          </a>

          <div>
            <Pill tone="clay">Latest upload</Pill>
            <h3 className="font-display mt-4 text-3xl leading-tight">
              {latest.title}
            </h3>
            <p className="mt-3 text-[0.9rem] text-ink-mute">
              Published {fmtDayLong(latest.published)}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={latest.href}
                target="_blank"
                rel="noreferrer"
                className="label inline-flex items-center border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
              >
                Watch on YouTube
              </a>
              <ButtonLink href="/watch/live" tone="outline">
                Watch live
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --- Dgroups ----------------------------------------------------------------- */

function Together({ count }: { count: number }) {
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
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <Eyebrow tone="paper">Dgroups</Eyebrow>
            <h2 className="display-lg mt-5">
              Life is better
              <br />
              <span className="italic text-clay">together</span>.
            </h2>
            <p className="mt-6 text-[1.05rem] leading-relaxed text-paper-bright/70">
              A Dgroup is a handful of people who meet weekly to open the Bible,
              tell the truth about their lives, and pray for each other. It is
              the centre of how CCF disciples people, not an add-on to Sunday.
            </p>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-paper-bright/70">
              There are {count} groups meeting around Centris right now, across
              every day of the week and every life stage.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink
                href="/grow/find-a-dgroup"
                size="lg"
                className="border-paper-bright bg-paper-bright text-night hover:bg-bone hover:border-bone"
              >
                Find a Dgroup
              </ButtonLink>
              <ButtonLink
                href="/grow/join-a-dgroup"
                tone="ghost"
                size="lg"
                className="text-paper-bright hover:bg-white/10 hover:border-white/25"
              >
                How Dgroups work →
              </ButtonLink>
            </div>
          </div>

          <div className="shrink-0">
            <p className="font-script text-5xl text-paper-bright/30">
              come as you are
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --- Communities -------------------------------------------------------------- */

function Communities({
  communities,
}: {
  communities: Awaited<ReturnType<typeof getCommunities>>;
}) {
  return (
    <Section tone="paper">
      <Container>
        <SectionHead
          eyebrow="Communities"
          title="Find the people in your season"
          lead="Whatever stage you are in, there are others at Centris in the same one."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {communities.map((c) => (
            <CommunityCard key={c.id} c={c} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* --- Explore ------------------------------------------------------------------ */

function ExploreCenter({
  facilities,
}: {
  facilities: Awaited<ReturnType<typeof getFacilities>>;
}) {
  const featured = facilities.filter((f) =>
    ["main-worship-hall", "sports-hall", "multipurpose-hall-1", "dgroup-lounge"].includes(
      f.slug,
    ),
  );

  return (
    <Section tone="bright">
      <Container>
        <SectionHead
          eyebrow="Explore CCF Centris"
          title="3,200 square metres, built to be used"
          lead="A worship hall for 1,300, a sports hall for 800, four flexible halls, and a lounge made for Dgroups."
          action={<ButtonLink href="/centris" tone="outline">Explore the center</ButtonLink>}
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((f) => (
            <Link
              key={f.id}
              href={`/centris/facilities/${f.slug}`}
              className="group border border-hairline bg-paper transition-colors hover:border-ink"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <MessageArt
                  seed={f.slug}
                  label={f.name}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg leading-tight">{f.name}</h3>
                {f.capacity ? (
                  <p className="mt-1 text-[0.82rem] text-ink-mute">
                    Capacity {f.capacity.toLocaleString()}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* --- Play --------------------------------------------------------------------- */

function PlayAtCentris({
  courts,
}: {
  courts: Awaited<ReturnType<typeof getSportsToday>>;
}) {
  const shown = courts.slice(0, 4);
  return (
    <Section tone="deep">
      <Container>
        <SectionHead
          eyebrow="Play at Centris"
          title="Basketball, badminton, pickleball"
          lead="The sports hall is open to the community, not just to CCF. Book a court, or come to an open night and get matched with whoever shows up."
          action={
            <div className="flex gap-3">
              <ButtonLink href="/centris/availability" tone="outline">
                Check availability
              </ButtonLink>
              <ButtonLink href="/centris/reserve">Reserve</ButtonLink>
            </div>
          }
        />

        <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {shown.map(({ court, nextFree, busyUntil }) => (
            <div key={court.id} className="bg-paper-bright p-5">
              <p className="label text-ink-mute">{court.sport}</p>
              <h3 className="font-display mt-1.5 text-xl">{court.name}</h3>
              {nextFree ? (
                <>
                  <p className="mt-4 text-[0.82rem] text-ink-mute">
                    {busyUntil ? "Next available" : "Available"}
                  </p>
                  <p className="font-display text-2xl text-moss">
                    {fmtTime(nextFree.start)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-[0.82rem] text-ink-mute">Today</p>
                  <p className="font-display text-2xl text-ink-mute">Fully booked</p>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 text-[0.8rem] text-ink-mute">
          Availability updates as bookings come in. Private booking details are
          never shown.
        </p>
      </Container>
    </Section>
  );
}

/* --- Serve --------------------------------------------------------------------- */

function Serve({ roles }: { roles: Awaited<ReturnType<typeof getVolunteerRoles>> }) {
  return (
    <Section tone="paper">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>Serve</Eyebrow>
            <h2 className="display-md mt-5">
              There&rsquo;s a place for you to serve.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-ink-soft">
              Every Sunday runs on volunteers. Welcome team, NXTGEN, production,
              sports, prayer. Most people start by trying one out for a month,
              with no expectation beyond that.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/serve">Find a ministry</ButtonLink>
              <ButtonLink href="/serve/at-centris" tone="ghost">
                Teams at Centris →
              </ButtonLink>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-px border border-hairline bg-hairline">
            {roles.slice(0, 8).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/serve/${r.slug}`}
                  className="flex h-full flex-col justify-between bg-paper-bright p-5 transition-colors hover:bg-bone"
                >
                  <span className="font-display text-lg leading-tight">{r.title}</span>
                  <span className="label mt-4 text-ink-mute">{r.ministry}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

/* --- Location ------------------------------------------------------------------ */

function FindUs() {
  return (
    <Section tone="bright">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow>Find us</Eyebrow>
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
              Centris Station connects directly to MRT-3 Quezon Avenue. Take the
              concourse into Eton Centris and head to the second floor. Parking
              is available on site.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/visit/directions">Full directions</ButtonLink>
              <a
                href={MAPS_LINK}
                target="_blank"
                rel="noreferrer"
                className="label inline-flex items-center border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
              >
                Open in maps
              </a>
            </div>
          </div>

          <div className="border border-hairline bg-paper">
            <iframe
              title="Map showing CCF Centris at Eton Centris, Quezon City"
              src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[4/3] w-full"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}

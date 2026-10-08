import Image from "next/image";
import Link from "next/link";
import { getServiceWindow, getUpcomingEvents, getUpcomingServices } from "@/lib/queries";
import { featuredEvent, weekAgenda } from "@/lib/whats-on";
import { FeaturedEvent, ThisWeek, WhatsHappening } from "@/components/home/whats-on";
import type { Replay } from "@/lib/ccf-net";
import { getWatchReplay } from "@/lib/watch";
import {
  getCurrentFourWsGuide,
  type FourWsCurrent,
} from "@/lib/content/public-queries";
import {
  CCF_NET,
  CONNECT_LINKS,
  MAPS_LINK,
  SERVICE_TIMES_TEXT,
  SITE,
  SOCIALS,
  YOUTUBE,
} from "@/lib/site";
import { ButtonLink, Container, LiveDot, Section, cx } from "@/components/ui";
import { hasAccounts } from "@/lib/auth/session";
import { HeroStage, Reveal, RevealHead, Stagger } from "@/components/motion";
import {
  FacebookGlyph,
  InstagramGlyph,
  YouTubeGlyph,
  PlayGlyph,
  SectionIcon,
  type IconName,
} from "@/components/icons";
import { YouTubeThumb } from "@/components/youtube-thumb";
import { InviteFriend } from "@/components/invite-friend";

/** Last Sunday's replay is read from CCF Net, which changes weekly. */
export const revalidate = 1800;

/**
 * Homepage. Short on purpose: it answers "when, where, and what do I do next",
 * then hands off to the tab that owns each topic. The pattern is borrowed from
 * life.church, whose campus pages lead with one card holding the service
 * times, the address, and "Invite a friend".
 *
 *   1. Welcome: the photo in a rounded frame (the calm look, 2026-09-30),
 *      with the visit card beside the welcome on desktop and below on phones
 *   2. What's on (2026-10-08): a banner for the next big event, this week
 *      at Centris, and What's Happening's posters. Each hides when empty.
 *   3. Take your next step: prayer, a Dgroup, a team
 *   4. Last Sunday: the CCF Net replay and this week's 4Ws
 */
export default async function HomePage() {
  const [service, { replay }, fourWs, events, services] = await Promise.all([
    getServiceWindow(),
    getWatchReplay(),
    getCurrentFourWsGuide(),
    getUpcomingEvents(undefined, { includeCalendarOnly: true }),
    getUpcomingServices(12),
  ]);
  const featured = featuredEvent(events);
  const week = weekAgenda({ events, services, includeEmpty: true });
  const posters = events.filter((e) => !e.calendar_only && e.id !== featured?.event.id).slice(0, 6);

  return (
    <>
      <Welcome live={service.current !== null} />
      {featured ? <FeaturedEvent featured={featured} /> : null}
      {week.some((d) => d.items.length) ? <ThisWeek days={week} /> : null}
      {posters.length ? <WhatsHappening events={posters} /> : null}
      <NextSteps accounts={hasAccounts()} />
      <LastSunday replay={replay} fourWs={fourWs} />
    </>
  );
}

/* --- 1. Welcome ------------------------------------------------------------ */

function Welcome({ live }: { live: boolean }) {
  return (
    <section className="bg-paper px-3 pt-3 sm:px-5 sm:pt-5">
      {/* The photo sits in a big rounded frame with space around it, like a
          card on the page (Ralph's pick, 2026-09-30). The ground is --night,
          set without the .bg-night class on purpose: globals.css lifts --clay
          for everything under .bg-night. */}
      <div className="relative isolate mx-auto max-w-[110rem] overflow-hidden rounded-[2rem] bg-[var(--night)]">
        <Image
          src="/photos/hero-welcome.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="no-frame -z-10 object-cover object-[58%_30%] lg:object-[center_30%]"
        />
        {/* A stronger phone overlay keeps the welcome readable over the
            tighter crop; desktop darkens from the copy's left edge. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-night/80 via-night/75 to-night/90 lg:bg-gradient-to-r lg:from-night/90 lg:via-night/65 lg:to-night/30"
        />

        <Container className="grid gap-8 py-8 sm:gap-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:items-center lg:gap-12 lg:py-14">
          <HeroStage className="min-w-0 max-w-3xl">
            <p className="text-[1rem] font-semibold text-clay-lift">Christ&rsquo;s Commission Fellowship</p>
            {/* Two lines, broken by hand: at display-xl "to" was left alone on
                the middle line. */}
            <h1 className="display-lg brand-face mt-4 text-paper-bright lg:text-[clamp(2.6rem,4.7vw,4.25rem)]">
              Welcome to
              <br />
              CCF&nbsp;Centris.
            </h1>
            {/* CCF's own welcome line, quoted verbatim from ccf.org.ph. */}
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-paper-bright/90 sm:text-[1.15rem]">
              Regardless of who you are or where life has taken you, you are more
              than welcome here.
            </p>
            {/* Full width while they stack, so two buttons of different word
                lengths do not leave a ragged edge down the phone screen. */}
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/visit" tone="on-dark" size="lg" className="w-full sm:w-auto">
                Plan your visit
              </ButtonLink>
              <ButtonLink href="/watch" tone="outline-on-dark" size="lg" className="w-full sm:w-auto">
                Watch last Sunday
              </ButtonLink>
            </div>
          </HeroStage>
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <VisitCard live={live} />
          </div>
        </Container>
      </div>
    </section>
  );
}

/**
 * Everything a first-time guest needs on one card: where, and how to get
 * there, and a way to bring someone along. Reads SERVICE_TIMES_TEXT and SITE, so it
 * can't drift from the rest of the site.
 */
function VisitCard({ live }: { live: boolean }) {
  const invite = `Join me at CCF Centris this Sunday, at ${SERVICE_TIMES_TEXT.replace(" and ", " or ")}. We meet at 2/F Centris Station, Eton Centris, right off MRT Quezon Avenue.`;

  return (
    <div className="surface p-5 text-ink sm:p-7">
      {live ? (
        <Link
          href="/watch"
          className="label tap gap-2 bg-clay px-3 py-1.5 text-paper-bright"
        >
          <LiveDot />
          Service happening now
        </Link>
      ) : (
        <p className="text-[0.95rem] font-semibold text-clay">Join us this Sunday</p>
      )}

      <p className="mt-2 text-balance text-[1.5rem] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[1.6rem]">{SERVICE_TIMES_TEXT}</p>

      <address className="mt-5 border-t border-rule pt-4 text-[0.95rem] not-italic leading-relaxed text-ink-soft">
        {SITE.addressLines.slice(0, 2).join(", ")}
        <br />
        {SITE.addressLines.slice(2).join(", ")}
      </address>
      <Link href="/visit#car" className="link label tap mt-1 text-clay underline underline-offset-4">
        Where to park
      </Link>

      {/* Straight into Google Maps navigation rather than via our own
          directions page: someone reading this card is usually already on the
          way, and the extra hop is one more tap before the route starts.
          /visit still carries the full route write-up for anyone planning. */}
      <div className="mt-5 grid gap-3">
        <ButtonLink href={MAPS_LINK} target="_blank" rel="noreferrer" full>
          Get directions
        </ButtonLink>
        <InviteFriend message={invite} />
      </div>

      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-rule pt-4">
        <Link href="/prayer-wall" className="link label tap text-clay underline underline-offset-4">
          Ask for prayer
        </Link>
        <Link href="/contact" className="link label tap text-clay underline underline-offset-4">
          Contact us
        </Link>
        {/* The three accounts as marks, not words: people recognise them
            faster that way. Each is a 44px touch target. */}
        <span className="-my-1 flex items-center sm:ml-auto">
          {[
            { href: SOCIALS.facebook, label: "CCF Centris on Facebook", Glyph: FacebookGlyph },
            { href: SOCIALS.instagram, label: "CCF Centris on Instagram", Glyph: InstagramGlyph },
            { href: YOUTUBE.channelUrl, label: "CCF on YouTube", Glyph: YouTubeGlyph },
          ].map(({ href, label, Glyph }) =>
            href ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="grid h-11 w-11 place-items-center text-clay transition-colors hover:text-clay-deep"
              >
                <Glyph className="h-5 w-5" />
              </a>
            ) : null,
          )}
        </span>
      </p>
    </div>
  );
}

/* --- 2. Take your next step ------------------------------------------------ */

const NEXT_STEPS: {
  icon: IconName;
  title: string;
  body: string;
  href: string;
  external: boolean;
}[] = [
  {
    icon: "heart",
    title: "Ask for prayer",
    body: "Post a request on the Prayer Wall, and the church will pray with you.",
    href: "/prayer-wall",
    external: false,
  },
  {
    icon: "people",
    title: "Join a Dgroup",
    body: "Find a small group that meets every week.",
    href: CONNECT_LINKS.dgroupSignup,
    external: true,
  },
  {
    icon: "hands",
    title: "Serve on a team",
    body: "Help run Sundays at Centris.",
    href: CONNECT_LINKS.volunteerSignup,
    external: true,
  },
];

/** First on the list once accounts are on: Ralph wants sign-up easy to find (2026-09-30). */
const SIGN_UP_STEP: (typeof NEXT_STEPS)[number] = {
  icon: "sparkle",
  title: "Create your account",
  body: "Book Dgroup tables and rooms, and post on the Prayer Wall.",
  href: "/sign-up",
  external: false,
};

function NextSteps({ accounts }: { accounts: boolean }) {
  const steps = accounts ? [SIGN_UP_STEP, ...NEXT_STEPS] : NEXT_STEPS;
  return (
    <Section tone="paper">
      <Container>
        <RevealHead
          align="center"
          title="Take your next step"
          className="mx-auto max-w-2xl"
        />
        <Stagger className={cx("mt-8 grid gap-4", steps.length === 4 ? "sm:grid-cols-2" : "lg:grid-cols-3")}>
          {steps.map((step) => (
            <StepCard key={step.title} {...step} />
          ))}
        </Stagger>
        <p className="mt-8 text-center">
          <Link
            href="/connect"
            className="link label tap text-clay underline underline-offset-4"
          >
            More ways to connect &rarr;
          </Link>
        </p>
      </Container>
    </Section>
  );
}

function StepCard({ icon, title, body, href, external }: (typeof NEXT_STEPS)[number]) {
  const inner = (
    <>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay-wash text-clay">
        <SectionIcon name={icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-[1.2rem] font-semibold leading-tight tracking-[-0.01em] group-hover:text-clay">
          {title}
        </span>
        <span className="mt-1.5 block text-[0.98rem] leading-relaxed text-ink-mute">
          {body}
        </span>
        {external ? (
          <span className="mt-3 block text-[0.88rem] font-semibold text-clay">
            Sign-up form &#8599;
          </span>
        ) : null}
      </span>
    </>
  );
  const cls =
    "group flex h-full items-start gap-5 surface p-7";

  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/* --- 3. Last Sunday -------------------------------------------------------- */

function LastSunday({
  replay,
  fourWs,
}: {
  replay: Replay | null;
  fourWs: FourWsCurrent | null;
}) {
  const pdf = fourWs?.guide?.downloadUrl ?? null;
  const byline = replay
    ? [replay.speaker, replay.dateLabel].filter(Boolean).join(" · ")
    : "";

  return (
    <Section tone="paper" className="pt-0!">
      <Container>
        <Reveal className="grid overflow-hidden surface md:grid-cols-[minmax(0,1.15fr)_1fr]">
          {replay ? (
            <Link
              href="/watch"
              className="relative block aspect-video overflow-hidden bg-ink md:aspect-auto md:min-h-full"
            >
              <YouTubeThumb videoId={replay.videoId} alt={replay.title} />
              <span className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-clay text-paper-bright">
                  <PlayGlyph className="ml-1 h-7 w-7" />
                </span>
              </span>
            </Link>
          ) : null}

          <div className="flex flex-col p-6 sm:p-9">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold text-clay">
              <SectionIcon name="play" className="h-4 w-4" />
              Last Sunday
            </p>
            <h2 className="display-md mt-3 text-balance">
              {replay ? replay.title : "Catch up on Sunday's message"}
            </h2>
            {byline ? (
              <p className="mt-2 text-[0.95rem] text-ink-mute">{byline}</p>
            ) : null}
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Watch the message, then talk it through with your Dgroup using
              this week&rsquo;s 4Ws guide.
            </p>
            {/* Names the guide's week, since the replay and the 4Ws can belong
                to different Sundays early in the week. */}
            {fourWs ? (
              <p className="mt-4 text-[0.92rem] font-medium text-ink-mute">
                4Ws for{" "}
                {fourWs.week.weekNumber ? `Week ${fourWs.week.weekNumber} · ` : ""}
                {fourWs.week.dateSpan ?? fourWs.week.serviceDateLabel}
              </p>
            ) : null}
            <div className="mt-auto flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap">
              {replay ? (
                <ButtonLink href="/watch">Watch now</ButtonLink>
              ) : (
                <ButtonLink href={CCF_NET.url} target="_blank" rel="noreferrer">
                  Watch on {CCF_NET.name}
                </ButtonLink>
              )}
              {pdf ? (
                <ButtonLink href={pdf} target="_blank" rel="noreferrer" tone="outline">
                  Download the 4Ws
                </ButtonLink>
              ) : fourWs ? (
                <ButtonLink href={`/watch/4ws/${fourWs.week.slug}`} tone="outline">
                  Read the 4Ws
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

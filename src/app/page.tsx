import Image from "next/image";
import Link from "next/link";
import { getServiceWindow } from "@/lib/queries";
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
  SERVICE_TIMES,
  SITE,
  SOCIALS,
  YOUTUBE,
} from "@/lib/site";
import { ButtonLink, Container, LiveDot, Section } from "@/components/ui";
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
 *   1. Welcome: photo hero, with the visit card beside the headline
 *   2. Take your next step: prayer, a Dgroup, a team
 *   3. Last Sunday: the CCF Net replay and this week's 4Ws
 */
export default async function HomePage() {
  const [service, { replay }, fourWs] = await Promise.all([
    getServiceWindow(),
    getWatchReplay(),
    getCurrentFourWsGuide(),
  ]);

  return (
    <>
      <Welcome live={service.current !== null} />
      <NextSteps />
      <LastSunday replay={replay} fourWs={fourWs} />
    </>
  );
}

/* --- 1. Welcome ------------------------------------------------------------ */

function Welcome({ live }: { live: boolean }) {
  return (
    /* The ground is --night, set without the .bg-night class on purpose.
       globals.css lifts --clay for everything under .bg-night, and the
       visit card is a paper surface inside this section: under that rule
       its links and "Get directions" button would turn pale teal on cream. */
    <section className="relative isolate flex flex-col justify-center overflow-hidden bg-[var(--night)] lg:min-h-[calc(100svh-var(--chrome,4.875rem))]">
      <Image
        src="/photos/hero-welcome.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="no-frame -z-10 object-cover"
        style={{ objectPosition: "center 30%" }}
      />
      {/* Darkens the photo under the white headline: from the bottom on
          phones, where the copy stacks, and from the left on desktop. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-night/95 via-night/65 to-night/30 lg:bg-gradient-to-r lg:from-night/90 lg:via-night/55 lg:to-night/15"
      />

      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-center lg:gap-16 lg:py-24">
        {/* Exactly one screen tall on phones and tablets, so the welcome is
            all there is until you scroll — the visit card used to crowd into
            the first view under the headline. `--chrome` is measured by
            ChromeOffset; the fallback is the header's own height, used for the
            first paint before that runs. */}
        <div className="relative flex min-h-[calc(100svh-var(--chrome,4.875rem))] flex-col justify-center py-14 lg:min-h-0 lg:py-0">
        <HeroStage className="max-w-3xl">
          <p className="label text-clay-lift">
            Christ&rsquo;s Commission Fellowship
          </p>
          {/* Two lines, broken by hand: at display-xl "to" was left alone on
              the middle line. */}
          <h1 className="display-lg brand-face mt-4 text-paper-bright">
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
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink
              href="/visit/new-here"
              tone="on-dark"
              size="lg"
              className="w-full sm:w-auto"
            >
              Plan your visit
            </ButtonLink>
            <ButtonLink
              href="/watch"
              tone="outline-on-dark"
              size="lg"
              className="w-full sm:w-auto"
            >
              Watch last Sunday
            </ButtonLink>
          </div>
        </HeroStage>
          <ScrollCue />
        </div>

        {/* Container carries no vertical padding below `lg` now that the block
            above owns the first screen, so the card supplies its own. */}
        <div className="pb-14 lg:pb-0">
          <VisitCard live={live} />
        </div>
      </Container>
    </section>
  );
}

/**
 * The nudge that says the page continues. A full-bleed hero that ends exactly
 * at the fold gives no edge to read as "cut off", so without this it looks
 * like the whole page. Hidden from assistive tech, which does not need it, and
 * dropped at `lg` where the visit card is already in view beside the headline.
 */
function ScrollCue() {
  return (
    <span
      aria-hidden
      className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-1.5 text-paper-bright/70 lg:hidden"
    >
      <span className="label text-[0.65rem]">Scroll</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v13m0 0 5-5m-5 5-5-5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Everything a first-time guest needs on one card: where, and how to get
 * there, and a way to bring someone along. Reads SERVICE_TIMES and SITE, so it
 * can't drift from the rest of the site.
 */
function VisitCard({ live }: { live: boolean }) {
  const [first] = SERVICE_TIMES;
  const invite = `Join me at CCF Centris this ${first.day} at ${first.time}. We meet at 2/F Centris Station, Eton Centris, right off MRT Quezon Avenue.`;

  return (
    <div className="border border-hairline bg-paper-bright p-6 text-ink shadow-[0_30px_80px_-40px_rgba(0,0,0,0.75)] sm:p-7">
      {live ? (
        <Link
          href="/watch"
          className="label tap gap-2 bg-clay px-3 py-1.5 text-paper-bright"
        >
          <LiveDot />
          Service happening now
        </Link>
      ) : (
        <p className="label text-clay">Join us this Sunday</p>
      )}

      <address className="mt-5 border-t border-hairline pt-4 text-[0.95rem] not-italic leading-relaxed text-ink-soft">
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
      <div className="mt-6 grid gap-2">
        <ButtonLink href={MAPS_LINK} target="_blank" rel="noreferrer" full>
          Get directions
        </ButtonLink>
        <InviteFriend message={invite} />
      </div>

      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-hairline pt-4">
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

function NextSteps() {
  return (
    <Section tone="bright" className="py-12! sm:py-20!">
      <Container>
        <RevealHead
          align="center"
          title="Take your next step"
          className="mx-auto max-w-2xl"
        />
        <Stagger className="mt-10 grid gap-4 lg:grid-cols-3">
          {NEXT_STEPS.map((step) => (
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
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay text-paper-bright">
        <SectionIcon name={icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="font-display block text-xl leading-tight group-hover:text-clay">
          {title}
        </span>
        <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-ink-soft">
          {body}
        </span>
        {external ? (
          <span className="label mt-3 block text-ink-mute">
            Sign-up form &#8599;
          </span>
        ) : null}
      </span>
    </>
  );
  const cls =
    "group flex h-full items-start gap-5 border border-hairline bg-paper-bright p-6 shadow-[0_18px_40px_-34px_rgba(23,21,15,0.55)] transition-colors hover:border-ink";

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
    <Section tone="paper" className="py-12! sm:py-20!">
      <Container>
        <Reveal className="grid overflow-hidden border border-hairline bg-paper-bright md:grid-cols-[minmax(0,1.15fr)_1fr]">
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
            <p className="label flex items-center gap-2.5 text-clay">
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
              <p className="label mt-4 text-ink-mute">
                4Ws for{" "}
                {fourWs.week.weekNumber ? `Week ${fourWs.week.weekNumber} · ` : ""}
                {fourWs.week.dateSpan ?? fourWs.week.serviceDateLabel}
              </p>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-3 pt-7">
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

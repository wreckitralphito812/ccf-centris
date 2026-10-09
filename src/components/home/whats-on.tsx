import Link from "next/link";
import { ButtonLink, Container, Section, cx } from "@/components/ui";
import { Reveal, RevealHead } from "@/components/motion";
import { PosterImage } from "@/components/poster-image";
import { PosterCard } from "@/components/poster-card";
import { PosterRail } from "@/components/poster-rail";
import { dateText } from "@/lib/announcements";
import { manilaDateKey } from "@/lib/format";
import type { CcfEvent } from "@/lib/types";
import type { AgendaDay, Featured } from "@/lib/whats-on";

/*
 * What's on, for the homepage (Ralph, 2026-10-08): a banner for the next big
 * event, the week at Centris at a glance, and What's Happening's posters.
 * Each one hides itself when there's nothing to show.
 */

const dayGap = (key: string, today: string) => Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
const weekday = (key: string, style: "long" | "short") =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: style });
const monthDay = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" });

/** "Today", "Tomorrow", "This Saturday", "Next Wednesday", or "In 18 days". */
function whenLabel(key: string, today: string): string {
  const n = dayGap(key, today);
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  // Weeks run Monday to Sunday: 0 is this week, 1 is next week.
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const week = Math.floor((n + dow) / 7);
  if (week === 0) return `This ${weekday(key, "long")}`;
  if (week === 1) return `Next ${weekday(key, "long")}`;
  return `In ${n} days`;
}

/* --- The banner ------------------------------------------------------------ */

export function FeaturedEvent({ featured }: { featured: Featured }) {
  const { event: e, next, happeningNow } = featured;
  const today = manilaDateKey();
  const more = (e.dates?.length ?? 1) - 1;
  return (
    <section className="bg-paper px-3 pt-4 sm:px-5 sm:pt-5" aria-label="Featured event">
      <Reveal className="mx-auto max-w-[110rem]">
        <article className="grid overflow-hidden rounded-[1.5rem] border border-hairline bg-paper-bright md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Link href={`/events/${e.slug}`} className="relative block aspect-video bg-mist md:aspect-auto md:min-h-[20rem]" aria-label={e.title}>
            <PosterImage src={e.cover_image_url!} alt={`${e.title} poster`} />
          </Link>
          <div className="flex flex-col p-6 sm:p-9">
            <p className="flex flex-wrap items-center gap-2 text-[0.95rem] font-semibold">
              <span className={cx("rounded-full px-3 py-1", happeningNow ? "bg-moss/15 text-moss" : "bg-clay-wash text-clay-deep")}>
                {happeningNow ? "Happening now" : whenLabel(manilaDateKey(new Date(next.starts_at)), today)}
              </span>
              {e.category ? <span className="text-ink-mute">{e.category}</span> : null}
            </p>
            <h2 className="display-md mt-4 text-balance">
              <Link href={`/events/${e.slug}`} className="hover:text-clay">
                {e.title}
              </Link>
            </h2>
            <p className="mt-2 text-[1rem] font-semibold text-ink">
              {dateText(next)}
              {more > 0 ? <span className="font-normal text-ink-mute"> · and {more} more {more === 1 ? "date" : "dates"}</span> : null}
            </p>
            {e.location_note ? <p className="mt-1 text-[0.95rem] text-ink-mute">{e.location_note}</p> : null}
            {e.summary ? <p className="mt-4 max-w-md leading-relaxed text-ink-soft">{e.summary}</p> : null}
            <div className="mt-auto flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap">
              {e.registration_url ? (
                <ButtonLink href={e.registration_url} target="_blank" rel="noreferrer">
                  Register
                </ButtonLink>
              ) : null}
              <ButtonLink href={`/events/${e.slug}`} tone={e.registration_url ? "outline" : undefined}>
                See the details
              </ButtonLink>
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}

/* --- The week -------------------------------------------------------------- */

export function ThisWeek({ days }: { days: AgendaDay[] }) {
  const today = manilaDateKey();
  return (
    <Section tone="paper" className="pb-0!">
      <Container>
        <RevealHead
          title="This week at Centris"
          action={
            <Link href="/events/calendar" className="link label tap text-clay underline underline-offset-4">
              Full calendar &rarr;
            </Link>
          }
        />
        {/* Seven columns on wide screens, quiet days included, so it reads
            as the week; phones list only the days with something on. */}
        <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2.5">
          {days.map((d) => {
            const isToday = d.key === today;
            const gap = dayGap(d.key, today);
            return (
              <li
                key={d.key}
                className={cx(
                  "rounded-2xl border p-4",
                  isToday ? "border-clay bg-paper-bright shadow-[0_0_0_1px_var(--color-clay)]" : "border-hairline",
                  d.items.length ? "bg-paper-bright" : "hidden bg-paper lg:block",
                )}
              >
                <p className="flex items-baseline justify-between gap-2 lg:block">
                  <span className={cx("block text-[1rem] font-bold", isToday ? "text-clay" : "text-ink")}>
                    {gap === 0 ? "Today" : gap === 1 ? "Tomorrow" : weekday(d.key, "long")}
                  </span>
                  <span className="block text-[0.85rem] text-ink-mute">{monthDay(d.key)}</span>
                </p>
                {d.items.length ? (
                  <ul className="mt-3 space-y-3">
                    {d.items.map((it, i) => (
                      <li key={`${it.title}-${i}`} className="grid grid-cols-[4.4rem_minmax(0,1fr)] gap-2 text-[0.93rem] leading-snug lg:block">
                        <span className="block tabular-nums text-[0.85rem] text-ink-mute">{it.time ?? "All day"}</span>
                        {it.href ? (
                          <Link href={it.href} className={cx("-my-1.5 block py-1.5 font-semibold hover:text-clay", it.kind === "service" ? "text-ink-soft" : "text-ink")}>
                            {it.title}
                          </Link>
                        ) : (
                          <span className="block text-ink-soft">
                            {it.title} <span className="whitespace-nowrap text-[0.8rem] text-ink-mute">· booked</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[0.9rem] text-ink-mute">&mdash;</p>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}

/* --- What's Happening ------------------------------------------------------ */

export function WhatsHappening({ events }: { events: CcfEvent[] }) {
  return (
    <Section tone="paper">
      <Container>
        <RevealHead
          title="What’s Happening"
          action={
            <Link href="/events" className="link label tap text-clay underline underline-offset-4">
              See everything &rarr;
            </Link>
          }
        />
        <PosterRail label="What's Happening" className="mt-7">
          {events.map((e) => (
            <li key={e.id} className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]">
              <PosterCard e={e} />
            </li>
          ))}
        </PosterRail>
      </Container>
    </Section>
  );
}

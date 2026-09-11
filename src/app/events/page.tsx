import type { Metadata } from "next";
import Link from "next/link";
import {
  ButtonLink,
  Container,
  EmptyState,
  Section,
  cx,
} from "@/components/ui";
import { EventCard, MessageArt } from "@/components/cards";
import { PosterRail } from "@/components/poster-rail";
import { getEventCategories, getUpcomingEvents } from "@/lib/queries";
import { fmtDayShort, fmtMonthYear, fmtTime } from "@/lib/format";
import type { CcfEvent } from "@/lib/types";

export const metadata: Metadata = {
  title: "What’s Happening",
  description:
    "What's on at CCF Centris: gatherings, classes, trainings, and community events, with the month at a glance.",
};

/**
 * What's Happening, laid out like life.church/media: a row of 16:9 posters
 * for everything coming up, then one full-width band per category, each with
 * its own sideways-scrolling row. The bands take CCF's own colours (pine,
 * white, teal, maroon) where life.church uses its ministry colours.
 *
 * "View all" and the category links open the flat grid of the same events,
 * grouped by month (?view=all, or ?category=…).
 */
export default async function EventsPage({
  searchParams,
}: PageProps<"/events">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const category = one(sp.category);
  const showAll = one(sp.view) === "all";

  const [events, categories] = await Promise.all([
    getUpcomingEvents(),
    getEventCategories(),
  ]);

  if (category || showAll) {
    return <EventGrid events={events} categories={categories} category={category} />;
  }

  // Categories in order of their soonest event, so the next thing up leads.
  // A category gets its own band only with two or more events: a band holding
  // one poster reads as empty, and a lone event already shows in Coming up.
  const rows = categories
    .map((c) => ({ name: c, list: events.filter((e) => e.category === c) }))
    .filter((r) => r.list.length > 1)
    .sort((a, b) => a.list[0].starts_at.localeCompare(b.list[0].starts_at));

  return (
    <>
      <header className="border-b border-hairline bg-paper-bright">
        <Container className="flex flex-col gap-6 py-10 sm:py-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="brand-face text-[2.6rem] sm:text-[3.6rem]">
              What&rsquo;s Happening
            </h1>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft sm:text-[1.1rem]">
              Gatherings, classes, trainings, and days out at CCF Centris.
              Every event says plainly whether you need to register.
            </p>
            {rows.length > 1 ? (
              <nav aria-label="Jump to a category" className="mt-6 flex flex-wrap gap-2">
                {rows.map((r) => (
                  <a
                    key={r.name}
                    href={`#${anchor(r.name)}`}
                    className="label border border-ink/25 px-3.5 py-2 text-ink transition-colors hover:border-ink"
                  >
                    {r.name}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
          <ButtonLink href="/events/calendar" tone="outline" size="lg" className="shrink-0">
            Month view
          </ButtonLink>
        </Container>
      </header>

      {events.length ? (
        <>
          <section className="bg-paper-bright py-12 sm:py-16">
            <Container>
              <RowHead title="Coming up" href="/events?view=all" count={events.length} />
              <PosterRail label="Coming up" className="mt-7">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
                  >
                    <PosterCard e={e} />
                  </li>
                ))}
              </PosterRail>
            </Container>
          </section>

          {rows.map((r, i) => {
            const band = BANDS[i % BANDS.length];
            return (
              <section
                key={r.name}
                id={anchor(r.name)}
                className={cx("scroll-mt-24 py-12 sm:py-16", band.cls)}
              >
                <Container className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
                  <div>
                    <h2 className="brand-face text-[2rem] sm:text-[2.5rem]">{r.name}</h2>
                    {CATEGORY_BLURB[r.name] ? (
                      <p className={cx("mt-4 leading-relaxed", band.dark ? "text-paper-bright/85" : "text-ink-soft")}>
                        {CATEGORY_BLURB[r.name]}
                      </p>
                    ) : null}
                    <Link
                      href={`/events?category=${encodeURIComponent(r.name)}`}
                      className={cx(
                        "label mt-6 inline-block border px-3.5 py-2 transition-colors",
                        band.dark
                          ? "border-paper-bright/50 text-paper-bright hover:border-paper-bright hover:bg-paper-bright/10"
                          : "border-ink/25 text-ink hover:border-ink",
                      )}
                    >
                      View all {r.list.length}
                    </Link>
                  </div>
                  <PosterRail label={r.name}>
                    {r.list.map((e) => (
                      <li
                        key={e.id}
                        className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)]"
                      >
                        <PosterCard e={e} dark={band.dark} />
                      </li>
                    ))}
                  </PosterRail>
                </Container>
              </section>
            );
          })}
        </>
      ) : (
        <Section>
          <Container>
            <EmptyState
              title="Nothing on the calendar yet."
              body="New gatherings and classes appear here as soon as they're announced."
            />
          </Container>
        </Section>
      )}
    </>
  );
}

/**
 * Band colours for the category rows, all from CCF's palette. Dark bands carry
 * white type: 5.4:1 on --clay, 9:1 on maroon (--sky), 14:1 on --night.
 */
const BANDS = [
  { cls: "bg-night text-paper-bright", dark: true },
  { cls: "bg-paper text-ink", dark: false },
  { cls: "bg-clay text-paper-bright", dark: true },
  { cls: "bg-paper-bright text-ink", dark: false },
  { cls: "bg-sky text-paper-bright", dark: true },
  { cls: "bg-paper-deep text-ink", dark: false },
] as const;

/** One line under a category heading. Categories not listed show none. */
const CATEGORY_BLURB: Record<string, string> = {
  Gathering: "Nights of worship and fellowship for the whole church.",
  Class: "Courses that meet over several weeks.",
  Training: "Equipping for Dgroup leaders and volunteers.",
  Sports: "Open play and leagues on the Centris court.",
};

function anchor(category: string) {
  return `c-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function RowHead({ title, href, count }: { title: string; href: string; count: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h2 className="brand-face text-[2rem] sm:text-[2.5rem]">{title}</h2>
      <Link
        href={href}
        className="label border border-ink/25 px-3.5 py-2 text-ink transition-colors hover:border-ink"
      >
        View all {count}
      </Link>
    </div>
  );
}

/**
 * A 16:9 event poster with its date and title under it. Uses the uploaded
 * poster when the event has one. Otherwise CCF-coloured placeholder art
 * carries the event's title, as a real poster would; a category name there
 * repeated down a whole row ("Sports, Sports").
 */
function PosterCard({ e, dark }: { e: CcfEvent; dark?: boolean }) {
  return (
    <Link href={`/events/${e.slug}`} className="group block">
      <div className="relative aspect-video overflow-hidden bg-ink/10">
        {e.cover_image_url ? (
          // Posters are uploaded by the admin from anywhere, so they can't
          // go through next/image's fixed list of allowed hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.cover_image_url}
            alt={`${e.title} poster`}
            loading="lazy"
            className="no-frame h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MessageArt
            seed={e.slug}
            label={e.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <p className={cx("label mt-3", dark ? "text-paper-bright/80" : "text-clay")}>
        {fmtDayShort(e.starts_at)} · {fmtTime(e.starts_at)}
      </p>
      <h3
        className={cx(
          "font-display mt-1.5 text-xl leading-snug",
          dark ? "text-paper-bright" : "text-ink group-hover:text-clay",
        )}
      >
        {e.title}
      </h3>
      {e.location_note ? (
        <p className={cx("mt-1 text-[0.88rem]", dark ? "text-paper-bright/75" : "text-ink-mute")}>
          {e.location_note}
        </p>
      ) : null}
    </Link>
  );
}

/* --- View all: the flat grid, grouped by month ------------------------------ */

function EventGrid({
  events: all,
  categories,
  category,
}: {
  events: CcfEvent[];
  categories: string[];
  category: string;
}) {
  const events = category ? all.filter((e) => e.category === category) : all;

  const byMonth = new Map<string, CcfEvent[]>();
  for (const e of events) {
    const key = fmtMonthYear(e.starts_at);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }

  return (
    <>
      <header className="border-b border-hairline bg-paper-bright">
        <Container className="py-10 sm:py-14">
          <Link href="/events" className="link label text-clay underline underline-offset-4">
            &larr; What&rsquo;s Happening
          </Link>
          <h1 className="brand-face mt-5 text-[2.6rem] sm:text-[3.6rem]">
            {category || "Everything coming up"}
          </h1>
        </Container>
      </header>

      <Section>
        <Container>
          <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
            <FilterChip href="/events?view=all" active={!category}>
              Everything
            </FilterChip>
            {categories.map((c) => (
              <FilterChip
                key={c}
                href={`/events?category=${encodeURIComponent(c)}`}
                active={category === c}
              >
                {c}
              </FilterChip>
            ))}
          </nav>

          <p className="mt-6 border-t border-hairline pt-5 text-[0.88rem] text-ink-mute">
            {events.length} {events.length === 1 ? "event" : "events"} coming up
            {category ? ` in ${category}` : ""}
          </p>

          {events.length ? (
            <div className="mt-10 space-y-14">
              {[...byMonth.entries()].map(([month, list]) => (
                <div key={month}>
                  <h2 className="font-display text-3xl">{month}</h2>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((e) => (
                      <EventCard key={e.id} e={e} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="Nothing in that category right now."
                body="Try another category, or look at everything coming up over the next few months."
                action={
                  <ButtonLink href="/events?view=all" tone="outline">
                    See everything
                  </ButtonLink>
                }
              />
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "label border border-clay bg-clay px-3.5 py-2 text-paper-bright"
          : "label border border-ink/25 px-3.5 py-2 text-ink transition-colors hover:border-ink"
      }
    >
      {children}
    </Link>
  );
}

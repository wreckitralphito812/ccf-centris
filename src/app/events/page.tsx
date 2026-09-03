import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  EmptyState,
  Section,
} from "@/components/ui";
import { EventCard } from "@/components/cards";
import { getEventCategories, getUpcomingEvents } from "@/lib/queries";
import { fmtMonthYear } from "@/lib/format";

export const metadata: Metadata = {
  title: "Events",
  description:
    "What's on at CCF Centris: gatherings, classes, retreats, sports programmes, volunteer days, and community events.",
};

export default async function EventsPage({
  searchParams,
}: PageProps<"/events">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const category = raw ?? "";

  const [all, categories] = await Promise.all([
    getUpcomingEvents(),
    getEventCategories(),
  ]);

  const events = category
    ? all.filter((e) => e.category === category)
    : all;

  // Group by Manila month so a long list reads as a calendar.
  const byMonth = new Map<string, typeof events>();
  for (const e of events) {
    const key = fmtMonthYear(e.starts_at);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="What&rsquo;s on at Centris."
        lead="Gatherings, classes, retreats, sports, and days out in the community. Most are free, and everything says plainly whether you need to register."
        actions={
          <ButtonLink href="/events/calendar" tone="outline" size="lg">
            Month view
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          {/* Category filter. Links rather than JS, so it works everywhere. */}
          <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
            <FilterChip href="/events" active={!category}>
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
                  <ButtonLink href="/events" tone="outline">
                    See everything
                  </ButtonLink>
                }
              />
            </div>
          )}
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ["Sunday services", "Worship every Saturday evening and twice on Sunday.", "/visit/service-times"],
              ["GLC classes", "Courses that run each term, from foundations to leading.", "/grow/glc"],
              ["Sports at Centris", "Open play, leagues, and clinics in the Sports Hall.", "/centris/sports"],
            ].map(([t, b, href]) => (
              <div key={t} className="border border-hairline bg-paper-bright p-6">
                <h3 className="font-display text-xl">{t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{b}</p>
                <ButtonLink href={href} tone="ghost" size="sm" className="mt-4 -ml-3.5">
                  Open →
                </ButtonLink>
              </div>
            ))}
          </div>
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

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Pill, Section } from "@/components/ui";
import { getServiceWindow, getUpcomingServices } from "@/lib/queries";
import { fmtDayLong, fmtTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Service times",
  description:
    "Worship service times at CCF Centris, Eton Centris, Quezon City. Saturday evening and two Sunday services, with NXTGEN alongside.",
};

export default async function ServiceTimesPage() {
  const [services, window] = await Promise.all([
    getUpcomingServices(12),
    getServiceWindow(),
  ]);

  // Group by Manila calendar day so the page reads as a schedule, not a list.
  const byDay = new Map<string, typeof services>();
  for (const s of services) {
    const key = fmtDayLong(s.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Service times"
        title="When we gather."
        lead="Services run about 90 minutes. NXTGEN runs alongside every Sunday service, and check-in opens 30 minutes before."
        actions={
          <>
            <ButtonLink href="/visit/plan" size="lg">
              Plan your visit
            </ButtonLink>
            <ButtonLink href="/watch/live" tone="outline" size="lg">
              Watch online
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <div className="space-y-12">
            {[...byDay.entries()].map(([day, list]) => (
              <div key={day}>
                <h2 className="font-display text-2xl">
                  {day}
                  {window.next && list.some((s) => s.id === window.next?.id) ? (
                    <Pill tone="clay" className="ml-3 align-middle">
                      Next
                    </Pill>
                  ) : null}
                </h2>
                <div className="mt-4 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((s) => (
                    <div key={s.id} className="bg-paper-bright p-6">
                      <p className="font-display text-4xl leading-none">
                        {fmtTime(s.starts_at)}
                      </p>
                      <p className="mt-3 font-semibold">{s.title}</p>
                      <p className="mt-1 text-[0.88rem] text-ink-soft">
                        {s.venue?.name}
                      </p>
                      {s.speaker ? (
                        <p className="mt-3 text-[0.85rem] text-ink-mute">
                          {s.speaker.name}
                        </p>
                      ) : null}
                      {s.series ? (
                        <p className="mt-0.5 text-[0.85rem] italic text-ink-mute">
                          {s.series.title}
                        </p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {s.nxtgen_available ? <Pill tone="muted">NXTGEN</Pill> : null}
                        <Pill tone="muted">Accessible seating</Pill>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                t: "Getting here",
                b: "MRT-3 Quezon Avenue connects to the Centris Station concourse. Parking is on site at Eton Centris.",
                href: "/visit/directions",
                cta: "Directions",
              },
              {
                t: "Coming with kids",
                b: "NXTGEN runs age-appropriate rooms on the same floor, staffed by screened volunteers.",
                href: "/visit/families",
                cta: "Families",
              },
              {
                t: "Can't make it",
                b: "Sunday services stream live, and every message stays in the archive with its 4Ws.",
                href: "/watch/live",
                cta: "Watch live",
              },
            ].map((c) => (
              <div key={c.t} className="border border-hairline bg-paper-bright p-6">
                <h3 className="font-display text-xl">{c.t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                  {c.b}
                </p>
                <ButtonLink href={c.href} tone="ghost" size="sm" className="mt-4 -ml-3.5">
                  {c.cta} →
                </ButtonLink>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { EventCard } from "@/components/cards";
import {
  getEventsForCommunity,
  getFacility,
  getSportsToday,
} from "@/lib/queries";
import { fmtTime, manilaDateKey } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sports at Centris",
  description:
    "Basketball, badminton, and pickleball at the CCF Centris Sports Hall. Open play, leagues, clinics, and sports ministry, open to the whole community.",
};

export const dynamic = "force-dynamic";

export default async function SportsPage() {
  const today = manilaDateKey();
  const [hall, courts, events] = await Promise.all([
    getFacility("sports-hall"),
    getSportsToday(today),
    getEventsForCommunity("sports"),
  ]);

  const bySport = new Map<string, typeof courts>();
  for (const c of courts) {
    bySport.set(c.court.sport, [...(bySport.get(c.court.sport) ?? []), c]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Sports at Centris"
        title={
          <>
            Play, then <span className="italic text-clay">stay</span>.
          </>
        }
        lead="An 800-capacity hall with a full basketball court that converts for badminton and pickleball. Open to the community, not just to CCF."
        tone="ink"
        actions={
          <>
            <ButtonLink
              href="/centris/reserve?facility=sports-hall"
              size="lg"
              className="border-paper-bright bg-paper-bright text-night hover:bg-bone hover:border-bone"
            >
              Reserve a court
            </ButtonLink>
            <ButtonLink
              href="/communities/sports"
              tone="ghost"
              size="lg"
              className="text-paper-bright hover:bg-white/10 hover:border-white/25"
            >
              Join sports ministry →
            </ButtonLink>
          </>
        }
      />

      {/* Two doors, deliberately separate */}
      <Section className="py-12">
        <Container>
          <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
            <div className="bg-paper-bright p-8">
              <Eyebrow>Play</Eyebrow>
              <h2 className="display-md mt-4">Book a court</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Turn up with your own group and play. Hourly bookings, open to
                anyone, no membership and no questions about what you believe.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/centris/reserve?facility=sports-hall">
                  Reserve
                </ButtonLink>
                <ButtonLink href="/centris/availability" tone="outline">
                  What&rsquo;s free
                </ButtonLink>
              </div>
            </div>
            <div className="bg-paper-bright p-8">
              <Eyebrow>Join</Eyebrow>
              <h2 className="display-md mt-4">Sports ministry</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Leagues, clinics, and open nights run by volunteers whose aim is
                to transform lives and nations for Jesus through sports. You are
                welcome whether or not you share that aim.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/communities/sports">Sports ministry</ButtonLink>
                <ButtonLink href="/serve/sports-ministry" tone="outline">
                  Volunteer
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Today */}
      <Section tone="deep">
        <Container>
          <SectionHead
            eyebrow="Sports at Centris today"
            title="What&rsquo;s open right now"
            action={
              <ButtonLink href="/centris/availability" tone="outline">
                Full schedule
              </ButtonLink>
            }
          />
          <div className="mt-10 space-y-8">
            {[...bySport.entries()].map(([sport, list]) => (
              <div key={sport}>
                <h3 className="font-display text-2xl capitalize">{sport}</h3>
                <div className="mt-4 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
                  {list.map(({ court, nextFree, busyUntil }) => (
                    <div key={court.id} className="bg-paper-bright p-5">
                      <p className="font-display text-xl">{court.name}</p>
                      {nextFree ? (
                        <>
                          <p className="mt-3 text-[0.8rem] text-ink-mute">
                            {busyUntil ? "Next available" : "Available from"}
                          </p>
                          <p className="font-display text-2xl text-moss">
                            {fmtTime(nextFree.start)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-3 text-[0.8rem] text-ink-mute">Today</p>
                          <p className="font-display text-2xl text-ink-mute">
                            Fully booked
                          </p>
                        </>
                      )}
                      <ButtonLink
                        href={`/centris/reserve?facility=sports-hall&court=${court.id}`}
                        tone="outline"
                        size="sm"
                        full
                        className="mt-4"
                      >
                        Book
                      </ButtonLink>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[0.85rem] text-ink-mute">
            Private booking details are never shown. Hall open{" "}
            {hall?.open_time.slice(0, 5)} to {hall?.close_time.slice(0, 5)}.
          </p>
        </Container>
      </Section>

      {/* Programmes */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="Programmes"
            title="More than court time"
            lead="Everything here is open to people outside CCF, and most participants are."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Open play", "Most weeknights. Show up alone, get matched, play. Equipment available at the desk."],
              ["Leagues", "Eight-week seasons in basketball. Register as a team, roster due a week before opening day."],
              ["Clinics", "Four-week coaching blocks for beginners. Most people arrive having never held a racket."],
              ["Sports camps", "School-holiday camps for children and teenagers, run with NXTGEN and Elevate."],
              ["Community games", "Days out with the barangays around Centris, using sport as the reason to meet."],
              ["Ministry nights", "Play first, then a short talk and a Dgroup on the court. Stay or go, entirely your call."],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-7">
                <h3 className="font-display text-xl">{t}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {events.length ? (
        <Section tone="bright">
          <Container>
            <SectionHead
              eyebrow="Coming up"
              title="Sports events"
              action={
                <ButtonLink href="/events?category=Sports" tone="outline">
                  All sports events
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              ["What to bring", "Non-marking indoor shoes are required on the sport floor. Rackets, paddles, and balls can be rented at the desk."],
              ["Do I need to be a member?", "No. The Sports Hall is open to everyone, and most people at open play are not CCF members."],
              ["Will I be preached at?", "No. You will be invited to things and you can say no and keep playing. That happens constantly."],
            ].map(([q, a]) => (
              <div key={q}>
                <h3 className="font-display text-lg">{q}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

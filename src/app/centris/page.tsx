import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { FacilityCard, MessageArt } from "@/components/cards";
import { getFacilities } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Explore CCF Centris",
  description:
    "Explore CCF Centris: a 1,300-seat worship hall, an 800-capacity sports hall, four multipurpose halls, and a Dgroup lounge on the 2nd floor of Centris Station.",
};

export default async function CentrisPage() {
  const facilities = await getFacilities();

  return (
    <>
      <PageHeader
        eyebrow="CCF Centris"
        title="3,200 square metres, built to be used."
        lead="A center designed so that worship, discipleship, sport, and community all happen under one roof, on one floor, in the middle of Quezon City."
        actions={
          <>
            <ButtonLink href="/centris/reserve" size="lg">
              Reserve a space
            </ButtonLink>
            <ButtonLink href="/centris/availability" tone="outline" size="lg">
              Check availability
            </ButtonLink>
          </>
        }
      />

      {/* The numbers */}
      <Section tone="ink" className="py-12">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["3,200", "square metres", "The whole center, on the second floor of Centris Station."],
              ["1,300", "seats", "The Main Worship Hall, where Sunday services happen."],
              ["800", "capacity", "The Sports Hall, a full basketball court that converts for other sports."],
              ["2,500", "combined", "Total capacity across the center when everything is running."],
            ].map(([n, unit, b]) => (
              <div key={unit}>
                <p className="font-display text-5xl leading-none text-clay">{n}</p>
                <p className="label mt-2 text-paper-bright/50">{unit}</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-paper-bright/70">
                  {b}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Floor guide */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="On the floor"
            title="What's where"
            lead="Everything is on the second floor, so there are no stairs between one part of the center and another."
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <ol className="space-y-px border border-hairline bg-hairline">
              {[
                ["Welcome Center", "First stop if it's your first Sunday. Staffed before and after every service.", "/centris/facilities/welcome-center"],
                ["Main Worship Hall", "1,300 seats, accessible bays, and the room Sunday happens in.", "/centris/facilities/main-worship-hall"],
                // No community page to send this one to — see the note above
                // Communities was pulled. Rendered as plain text below.
                ["NXTGEN rooms", "Children's rooms by age band, with check-in just outside.", null],
                ["Sports Hall", "Basketball, badminton, and pickleball, open to the community.", "/centris/facilities/sports-hall"],
                ["Multipurpose Halls 1–4", "Flexible rooms for classes, trainings, and gatherings.", "/centris/facilities"],
                ["Dgroup Lounge", "Soft seating built for the groups that meet through the week.", "/centris/facilities/dgroup-lounge"],
              ].map((row, i) => {
                const [name, blurb, href] = row as [string, string, string | null];
                const body = (
                  <>
                    <span className="font-display shrink-0 text-3xl leading-none text-clay/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="font-display block text-xl transition-colors group-hover:text-clay">
                        {name}
                      </span>
                      <span className="mt-1 block text-[0.9rem] leading-relaxed text-ink-soft">
                        {blurb}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={name}>
                    {href ? (
                      <Link
                        href={href}
                        className="group flex gap-5 bg-paper-bright p-6 transition-colors hover:bg-bone"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="group flex gap-5 bg-paper-bright p-6">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="border border-hairline bg-paper-bright p-6">
              <p className="label text-ink-mute">Accessibility</p>
              <h3 className="font-display mt-3 text-2xl leading-tight">
                Step-free from the concourse.
              </h3>
              <ul className="mt-5 space-y-3 text-[0.92rem] leading-relaxed text-ink-soft">
                {[
                  "Lift access from the Centris Station concourse to the second floor.",
                  "Accessible washrooms on the same floor as the worship hall.",
                  "Wheelchair spaces with companion seats at the rear and side bays.",
                  "Assisted listening available at the Welcome Center.",
                  "Service animals welcome throughout the center.",
                ].map((l) => (
                  <li key={l} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-clay" />
                    {l}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/accessibility" tone="outline" className="mt-6">
                Full accessibility guide
              </ButtonLink>
              <p className="mt-5 border-t border-hairline pt-4 text-[0.82rem] leading-relaxed text-ink-mute">
                Detailed floor plans will be published here once official
                layouts are available from the CCF Centris team.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Spaces */}
      <Section tone="deep">
        <Container>
          <SectionHead
            eyebrow="Spaces at CCF Centris"
            title="Every room, in detail"
            action={
              <ButtonLink href="/centris/facilities" tone="outline">
                All facilities
              </ButtonLink>
            }
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.slice(0, 6).map((f) => (
              <FacilityCard key={f.id} f={f} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Play */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Eyebrow>Play at Centris</Eyebrow>
              <h2 className="display-md mt-5">
                The Sports Hall is open to everyone.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Not just to CCF members. Book a court, come to an open night, or
                join a league. Most people at open play have never been to a
                Sunday service, and that is entirely the point.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/centris/sports">Sports at Centris</ButtonLink>
                <ButtonLink href="/centris/availability" tone="outline">
                  What&rsquo;s free today
                </ButtonLink>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden border border-hairline">
              <MessageArt seed="sports-hall" label="Play" className="h-full w-full" />
            </div>
          </div>
        </Container>
      </Section>

      {/* Location */}
      <Section tone="bright">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <Eyebrow>Find us</Eyebrow>
              <address className="font-display mt-4 text-2xl not-italic leading-snug sm:text-3xl">
                {SITE.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/visit#getting-here">Directions</ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

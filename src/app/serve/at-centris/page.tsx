import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { VolunteerCard } from "@/components/cards";
import { getVolunteerRoles } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Serve at Centris",
  description:
    "What it takes to run CCF Centris each week, and the teams that do it: welcome, NXTGEN, worship, production, sports, facilities, and prayer.",
};

export default async function ServeAtCentrisPage() {
  const roles = await getVolunteerRoles();

  return (
    <>
      <PageHeader
        eyebrow="Serve at Centris"
        title="What it takes to open the doors."
        lead="A 3,200 square metre center with a 1,300-seat hall does not run itself. Here is honestly what happens each week, and where you would fit."
        actions={
          <ButtonLink href="/serve" size="lg">
            See every role
          </ButtonLink>
        }
      />

      {/* A Sunday, hour by hour */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="A Sunday at Centris"
            title="Hour by hour"
            lead="Most volunteers are here for about three hours. Very few are here all day."
          />
          <ol className="mt-10 space-y-px border border-hairline bg-hairline">
            {[
              ["6:30", "Facilities open the center. Chairs, staging, and the sport floor reset from whatever ran the night before."],
              ["7:00", "Production start sound and lighting checks. The worship team arrives for rehearsal."],
              ["8:00", "Welcome team brief. NXTGEN volunteers set their rooms and check the check-in system."],
              ["8:30", "Doors open. NXTGEN check-in starts. Ushers take positions in the hall."],
              ["9:00", "First service. Production run the room and the stream. Prayer team wait at the front."],
              ["10:30", "Service ends. Prayer team meet people at the front. NXTGEN pickup begins. Rooms reset for the next service."],
              ["11:30", "Second service, same again with a fresh team on most positions."],
              ["13:15", "Facilities reset the center for the week. Sports Hall converts back for evening play."],
            ].map(([time, what]) => (
              <li key={time} className="flex gap-6 bg-paper-bright p-6">
                <span className="font-display w-16 shrink-0 text-2xl leading-none text-clay">
                  {time}
                </span>
                <p className="leading-relaxed text-ink-soft">{what}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Beyond Sunday */}
      <Section tone="deep">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow>The rest of the week</Eyebrow>
              <h2 className="display-md mt-5">
                Centris is busiest on a Tuesday.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Sunday is the visible part. The center is open most days, and a
                lot of the serving happens when nobody is watching.
              </p>
              <ButtonLink href="/centris" tone="outline" className="mt-7">
                Explore the center
              </ButtonLink>
            </div>

            <ul className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {[
                ["Sports Hall", "Open play most weeknights and leagues each season. Volunteers referee, run rotations, and lock up."],
                ["Dgroup Lounge", "Groups meeting through the week. Someone makes coffee and keeps the room usable."],
                ["GLC classes", "Courses each term across the multipurpose halls, needing setup, registration, and materials."],
                ["Events", "Retreats, workshops, and outreach days that all need people to carry, set up, and pack down."],
              ].map(([t, b]) => (
                <li key={t} className="bg-paper-bright p-6">
                  <h3 className="font-display text-lg">{t}</h3>
                  <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
                    {b}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead
            eyebrow="Teams"
            title="Every role at this center"
            action={
              <ButtonLink href="/serve" tone="outline">
                How serving works
              </ButtonLink>
            }
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <VolunteerCard key={r.id} r={r} />
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Give one Sunday a month.</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                That is genuinely enough to make a difference to a team. Most
                people who serve here started with less than they expected to.
              </p>
            </div>
            <ButtonLink
              href="/serve"
                tone="on-dark"
            >
              Find your place
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}

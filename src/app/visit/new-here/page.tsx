import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";
import { getFaqs, getUpcomingServices } from "@/lib/queries";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "New here",
  description:
    "What to expect on your first Sunday at CCF Centris: when to arrive, what to wear, where to park, and what happens with your kids.",
};

export default async function NewHerePage() {
  const [services, faqs] = await Promise.all([
    getUpcomingServices(3),
    getFaqs("visit"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="New here"
        title="Your first Sunday, without the guesswork."
        lead="Here is honestly everything that happens, so nothing catches you off guard."
        actions={
          <ButtonLink href="/visit/service-times" size="lg">
            See service times
          </ButtonLink>
        }
      />

      {/* Welcome */}
      <Section tone="bright">
        <Container>
          <div className="max-w-2xl">
            <h2 className="display-md text-balance">Welcome to CCF</h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
              Get to know who we are, what we believe, and how you can find
              your place at Christ&rsquo;s Commission Fellowship.
            </p>
          </div>

          <div className="mt-10 overflow-hidden border border-hairline bg-night">
            <video
              data-welcome-video="true"
              aria-label="Welcome to CCF"
              className="aspect-video w-full bg-night object-contain"
              controls
              poster="/videos/welcome-to-ccf-poster.jpg"
              playsInline
              preload="metadata"
            >
              <source
                src="/videos/Welcome to Christ's Commission Fellowship!.mp4"
                type="video/mp4"
              />
              Your browser does not support embedded video. You can{" "}
              <a href="/videos/Welcome to Christ's Commission Fellowship!.mp4">
                watch the Welcome to CCF video directly
              </a>
              .
            </video>
          </div>
        </Container>
      </Section>

      {/* Walkthrough */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="What to expect"
            title="Ninety minutes, start to finish"
          />

          <ol className="mt-12 space-y-px border border-hairline bg-hairline">
            {[
              {
                t: "Before you arrive",
                b: "Take MRT-3 to Quezon Avenue and walk through the Centris Station concourse, or drive into Eton Centris and park on site. We are on the second floor. Give yourself 15 minutes.",
              },
              {
                t: "At the door",
                b: "Someone from the Welcome Team is at the entrance. Tell them it is your first time and they will walk you in, show you where the washrooms are, and find you a seat.",
              },
              {
                t: "Worship",
                b: "About 25 minutes of singing. Words are on the screen. Stand, sit, sing, or just listen. Nobody is watching you.",
              },
              {
                t: "The message",
                b: "Around 40 minutes of teaching straight from a passage of the Bible. Bring one if you have one, or read along on the screen.",
              },
              {
                t: "After",
                b: "The prayer team stays at the front if you want someone to pray with you. The Welcome Center is open for 30 minutes. There is no offering plate passed down the row.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-6 bg-paper-bright p-7">
                <span className="font-display shrink-0 text-4xl leading-none text-clay/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-xl">{s.t}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Next services */}
      <Section tone="deep">
        <Container>
          <SectionHead
            eyebrow="Coming up"
            title="Next services"
            action={
              <ButtonLink href="/visit/service-times" tone="outline">
                All service times
              </ButtonLink>
            }
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="bg-paper-bright p-7">
                <p className="label text-clay">{fmtDayLong(s.starts_at)}</p>
                <p className="font-display mt-3 text-4xl leading-none">
                  {fmtTime(s.starts_at)}
                </p>
                <p className="mt-3 text-[0.9rem] text-ink-soft">{s.venue?.name}</p>
                {s.nxtgen_available ? (
                  <p className="mt-1 text-[0.85rem] text-ink-mute">NXTGEN available</p>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Quick answers */}
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Eyebrow>Quick answers</Eyebrow>
              <h2 className="display-md mt-5">
                The questions everyone asks first.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                If yours is not here, ask anyone at the Welcome Center, or send
                us a note and a real person will reply.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/visit/faqs" tone="outline">
                  All FAQs
                </ButtonLink>
                <ButtonLink href="/contact" tone="ghost">
                  Ask a question →
                </ButtonLink>
              </div>
            </div>

            <dl className="divide-y divide-hairline border-y border-hairline">
              {faqs.slice(0, 6).map((f) => (
                <div key={f.id} className="py-5">
                  <dt className="font-display text-lg">{f.question}</dt>
                  <dd className="mt-1.5 leading-relaxed text-ink-soft">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      {/* Where */}
      <Section tone="ink">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Eyebrow tone="paper">Where to find us</Eyebrow>
              <address className="font-display mt-6 text-3xl not-italic leading-snug sm:text-4xl">
                {SITE.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
              <div className="mt-8">
                <ButtonLink
                  href="/visit/directions"
                tone="on-dark"
                >
                  Directions and parking
                </ButtonLink>
              </div>
            </div>
            <p className="font-display font-light tracking-wide text-4xl leading-tight text-paper-bright/85 sm:text-5xl">
              there&rsquo;s a seat for you
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Know Jesus",
  description:
    "Who Jesus is, what the gospel says, and what to do next. No pressure, no script, and nobody will chase you.",
};

/**
 * CCF's own gospel presentation, following the structure and Scripture
 * references used on ccf.org.ph rather than an invented alternative.
 */
const STEPS = [
  {
    n: "01",
    title: "God made you for a relationship with him",
    body: "Not for religion or rule-keeping. The Bible describes a God who keeps his promises across generations and wants to be known.",
    verse:
      "Know therefore that the Lord your God, He is God, the faithful God, who keeps His covenant and His lovingkindness to a thousandth generation with those who love Him and keep His commandments.",
    ref: "Deuteronomy 7:9",
  },
  {
    n: "02",
    title: "But we are separated from him",
    body: "Not by God's reluctance. By our own sin, which every person has in common regardless of how good a life looks from outside.",
    verse:
      "Everyone has sinned and is far away from God's saving presence.",
    ref: "Romans 3:23",
  },
  {
    n: "03",
    title: "So he made a way",
    body: "Jesus died on the cross for our sins and was raised to life. Not because we deserved it, but while we were still in the wrong.",
    verse:
      "But God demonstrates His own love toward us, in that while we were yet sinners, Christ died for us.",
    ref: "Romans 5:8",
  },
  {
    n: "04",
    title: "Jesus is the way",
    body: "Christianity claims something specific and exclusive here. It is worth taking seriously rather than softening.",
    verse:
      "I am the way, and the truth, and the life; no one comes to the Father but through Me.",
    ref: "John 14:6",
  },
  {
    n: "05",
    title: "It is received, not earned",
    body: "By placing our faith in Jesus Christ, we are forgiven and saved from eternal death. It is a gift, which means it cannot be worked for or paid back.",
    verse:
      "For by grace you have been saved through faith; and that not of yourselves, it is the gift of God; not as a result of works, so that no one may boast.",
    ref: "Ephesians 2:8-9",
  },
];

export default function KnowJesusPage() {
  return (
    <>
      <PageHeader
        eyebrow="Know Jesus"
        title="Start here."
        lead="If you are not sure where you stand with God, this page lays out what CCF believes and why. Read it, disagree with it, or come back to it. Nobody will chase you."
        tone="ink"
      />

      {/* The gospel, as CCF presents it */}
      <Section>
        <Container>
          <ol className="space-y-px border border-hairline bg-hairline">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-paper-bright p-7 sm:p-9">
                <div className="grid gap-6 lg:grid-cols-[5rem_1fr_20rem] lg:items-start lg:gap-10">
                  <span className="font-display text-5xl leading-none text-clay/25">
                    {s.n}
                  </span>
                  <div>
                    <h2 className="font-display text-2xl leading-tight sm:text-3xl">
                      {s.title}
                    </h2>
                    <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
                      {s.body}
                    </p>
                  </div>
                  <blockquote className="border-l-2 border-clay pl-5">
                    <p className="text-[0.92rem] italic leading-relaxed text-ink-soft">
                      &ldquo;{s.verse}&rdquo;
                    </p>
                    <cite className="label mt-2 block not-italic text-clay">
                      {s.ref}
                    </cite>
                  </blockquote>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* The prayer */}
      <Section tone="deep">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <Eyebrow>If you want to</Eyebrow>
              <h2 className="display-md mt-5">
                Would you like to place your faith in Jesus Christ today?
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                There is nothing magic about the words. A prayer does not save
                anyone, God does. But if you have decided and want language for
                it, this is what CCF uses.
              </p>
              <p className="mt-4 leading-relaxed text-ink-soft">
                And if you are not there, that is genuinely fine. Nobody needs
                to pray this to keep reading, keep coming, or keep asking
                questions.
              </p>
            </div>

            <div className="taped border border-hairline bg-paper-bright p-8 pt-10">
              <p className="font-display font-light tracking-wide text-2xl leading-relaxed text-ink">
                Lord Jesus, I need You. I confess that I am a sinner. I believe
                that You died on the cross to pay for all my sins. With Your
                help, I will turn away from my sins. Please come into my life
                and be my Savior and my Master. I accept Your gift of eternal
                life. Make me the kind of new person You want me to be. Thank
                You for giving me eternal life. Amen.
              </p>
            </div>
          </div>

          <div className="mt-12 max-w-3xl border-l-2 border-clay bg-paper-bright py-5 pl-6 pr-5">
            <p className="text-[0.95rem] italic leading-relaxed text-ink-soft">
              &ldquo;And the testimony is this, that God has given us eternal
              life, and this life is in His Son. He who has the Son has the life;
              he who does not have the Son of God does not have the life. These
              things I have written to you who believe in the name of the Son of
              God, so that you may know that you have eternal life.&rdquo;
            </p>
            <cite className="label mt-3 block not-italic text-clay">
              1 John 5:11-13
            </cite>
          </div>
        </Container>
      </Section>

      {/* What now */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="What now"
            title="Whatever you decided"
            lead="These are open to you either way. None of them require you to have prayed anything."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: "Talk to someone",
                b: "A real conversation with a person, not a form letter. Private, and at your pace.",
                href: "/care/talk",
                cta: "Talk to someone",
              },
              {
                t: "Come on a Sunday",
                b: "See what it is actually like before deciding anything. Stay as long as you like, leave whenever.",
                href: "/visit/service-times",
                cta: "See service times",
              },
              {
                t: "Join a Dgroup",
                b: "There is a group specifically for people new to faith, where every question is genuinely welcome.",
                href: "/grow/find-a-dgroup",
                cta: "Find a Dgroup",
              },
              {
                t: "Keep reading",
                b: "Messages, reading plans, and guides for anyone working out what they think.",
                href: "/grow/resources",
                cta: "Resources",
              },
            ].map((c) => (
              <div key={c.t} className="flex flex-col bg-paper-bright p-6">
                <h3 className="font-display text-xl leading-tight">{c.t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                  {c.b}
                </p>
                <ButtonLink
                  href={c.href}
                  tone="outline"
                  size="sm"
                  full
                  className="mt-auto pt-2"
                >
                  {c.cta}
                </ButtonLink>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl leading-relaxed text-ink-mute">
            CCF&rsquo;s own words: regardless of who you are or where life has
            taken you, you are more than welcome here.
          </p>
        </Container>
      </Section>
    </>
  );
}

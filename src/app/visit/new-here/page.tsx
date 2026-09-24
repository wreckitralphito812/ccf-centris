import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { SectionIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "New here",
  description:
    "What to expect on your first Sunday at CCF Centris. A video walkthrough is on its way.",
};

/**
 * Placeholder, on CCF's request. The walkthrough content this page used to
 * carry (the 90-minutes-start-to-finish steps, quick answers, next services,
 * and where-to-find-us) is pulled until CCF Centris has its own welcome
 * video to lead with — the "Welcome to CCF" video here previously was CCF's
 * national one, not Centris-specific, and CCF would rather wait than show
 * the wrong center's welcome. Swap this section for the real video and
 * content once it is uploaded.
 */
export default function NewHerePage() {
  return (
    <>
      <PageHeader
        eyebrow="New here"
        title="Your first Sunday at CCF Centris."
        lead="We're putting together a video walkthrough of what to expect. In the meantime, here's how to find us."
        actions={
          <ButtonLink href="/visit#getting-here" size="lg">
            Getting here
          </ButtonLink>
        }
      />

      <Section tone="bright">
        <Container>
          {/* Sunday guests coming in past the Welcome Center team. Photo from
              the Centris comms team, 2026-09-13. */}
          <figure className="mx-auto mb-10 max-w-xl">
            <div className="relative aspect-[4/5] overflow-hidden border border-hairline bg-paper sm:aspect-[4/3]">
              <Image
                src="/photos/arriving-sunday.jpg"
                alt="Guests walking into CCF Centris on a Sunday, greeted at the door"
                fill
                sizes="(min-width: 640px) 36rem, 100vw"
                className="object-cover"
                style={{ objectPosition: "center 60%" }}
              />
            </div>
          </figure>
          <div className="mx-auto flex max-w-xl flex-col items-center border border-dashed border-hairline bg-paper-bright px-8 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-clay/10 text-clay">
              <SectionIcon name="play" className="h-6 w-6" />
            </span>
            <h2 className="font-display mt-6 text-2xl">Video coming soon</h2>
            <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
              Until it&rsquo;s ready, look for the Welcome Center team on
              Sunday. They&rsquo;ll show you around.
            </p>
            <ButtonLink href="/contact" tone="outline" className="mt-7">
              Ask a question
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}

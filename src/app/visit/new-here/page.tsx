import type { Metadata } from "next";
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
        title="Your first Sunday, without the guesswork."
        lead="We're putting together a video walkthrough of what to expect. In the meantime, here's how to find us."
        actions={
          <ButtonLink href="/visit/directions" size="lg">
            Getting here
          </ButtonLink>
        }
      />

      <Section tone="bright">
        <Container>
          <div className="mx-auto flex max-w-xl flex-col items-center border border-dashed border-hairline bg-paper-bright px-8 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-clay/10 text-clay">
              <SectionIcon name="play" className="h-6 w-6" />
            </span>
            <h2 className="font-display mt-6 text-2xl">Video coming soon</h2>
            <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
              A walkthrough of your first Sunday at CCF Centris is on its way.
              Until then, the Welcome Center team will walk you through
              everything in person.
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

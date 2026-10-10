import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";

/**
 * A page that shows one of CCF Main's own pages in place (2026-10-10): the
 * privacy policy and the terms are CCF's, so CCF Centris shows CCF's, kept
 * current by CCF. A link opens the original too, for anyone whose browser
 * won't show it inside the page.
 */
export function EmbeddedPage({
  eyebrow,
  title,
  lead,
  src,
  frameTitle,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  src: string;
  frameTitle: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        actions={
          <ButtonLink href={src} target="_blank" rel="noreferrer" tone="outline" size="lg">
            Open on ccf.org.ph
          </ButtonLink>
        }
      />
      <Section>
        <Container>
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper-bright">
            <iframe
              src={src}
              title={frameTitle}
              className="block h-[120rem] w-full sm:h-[100rem]"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="mt-4 text-[0.92rem] text-ink-mute">
            Not loading?{" "}
            <a href={src} target="_blank" rel="noreferrer" className="font-semibold text-clay underline underline-offset-4">
              Read it on ccf.org.ph
            </a>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}

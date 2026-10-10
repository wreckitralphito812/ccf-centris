import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { GIVE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Give",
  description: "Give your tithes and offerings to CCF online, by bank, bills payment, debit or credit card.",
};

/**
 * Giving (Ralph, 2026-10-10): CCF's own giving form, shown in the page so
 * people don't leave the site. The form is CCF's, and so is everything typed
 * into it; this site never sees it. Some banks' card checks won't run inside
 * another site's page, so the form can also open in its own tab.
 */
export default function GivePage() {
  return (
    <>
      <PageHeader
        eyebrow="Give"
        title="Give to the work of God."
        lead="Your tithes and offerings go to Christ's Commission Fellowship through CCF's secure giving form, by bank transfer, bills payment, debit or credit card."
        actions={
          <ButtonLink href={GIVE_URL} target="_blank" rel="noreferrer" tone="outline" size="lg">
            Open in a new tab
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper-bright">
            <iframe
              src={GIVE_URL}
              title="CCF giving form"
              className="block h-[110rem] w-full sm:h-[95rem]"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="payment"
            />
          </div>
          <p className="mt-4 text-[0.92rem] text-ink-mute">
            Form not loading, or stuck on a card or bank step?{" "}
            <a href={GIVE_URL} target="_blank" rel="noreferrer" className="font-semibold text-clay underline underline-offset-4">
              Open CCF&rsquo;s giving form in a new tab
            </a>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}

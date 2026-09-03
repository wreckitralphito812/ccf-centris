import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { getFaqs } from "@/lib/queries";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Common questions about visiting CCF Centris: what to wear, registration, children, accessibility, parking, Dgroups, and using the sports hall.",
};

const GROUPS: { key: string; label: string; blurb: string }[] = [
  { key: "visit", label: "Visiting", blurb: "Your first Sunday" },
  { key: "access", label: "Accessibility", blurb: "Getting in and around" },
  { key: "grow", label: "Growing", blurb: "Dgroups and next steps" },
  { key: "play", label: "Sports", blurb: "Using the courts" },
];

export default async function FaqsPage() {
  const all = await getFaqs();

  // Structured data helps these answers surface in search directly.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        eyebrow="FAQs"
        title="The practical questions."
        lead="If yours is not answered here, ask us. A real person replies."
        actions={
          <ButtonLink href="/contact" size="lg">
            Ask a question
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          <div className="space-y-16">
            {GROUPS.map((g) => {
              const items = all.filter((f) => f.category === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key} className="grid gap-8 lg:grid-cols-[16rem_1fr]">
                  <div>
                    <h2 className="font-display text-3xl">{g.label}</h2>
                    <p className="mt-2 text-[0.9rem] text-ink-mute">{g.blurb}</p>
                  </div>
                  <dl className="divide-y divide-hairline border-y border-hairline">
                    {items.map((f) => (
                      <div key={f.id} className="py-6">
                        <dt className="font-display text-xl leading-snug">
                          {f.question}
                        </dt>
                        <dd className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
                          {f.answer}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="flex flex-col gap-6 border border-hairline bg-paper-bright p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl">Still not sure about something?</h2>
              <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">
                Ask us anything, or if you would rather talk to someone about
                something heavier, we have a private way to do that too.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact">Contact us</ButtonLink>
              <ButtonLink href="/care/talk" tone="outline">
                Talk to someone
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

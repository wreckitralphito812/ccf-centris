import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { NAV } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Everything you need for your first Sunday at CCF Centris: service times, directions, parking, NXTGEN, and accessibility.",
};

export default function VisitPage() {
  const items = NAV.find((g) => g.label === "Visit")?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Visit"
        title={
          <>
            New to CCF? <span className="italic text-clay">We&rsquo;d love to meet you.</span>
          </>
        }
        lead="Join us any Sunday. No registration, no dress code, and nobody will ask you to stand up."
        actions={
          <>
            <ButtonLink href="/visit/new-here" size="lg">
              What to expect
            </ButtonLink>
            <ButtonLink href="/visit/directions" tone="outline" size="lg">
              Get directions
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="group flex flex-col bg-paper-bright p-7 transition-colors hover:bg-bone"
              >
                <h2 className="font-display text-2xl leading-tight transition-colors group-hover:text-clay">
                  {i.label}
                </h2>
                {i.blurb ? (
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                    {i.blurb}
                  </p>
                ) : null}
                <span className="label mt-6 text-clay">Open →</span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

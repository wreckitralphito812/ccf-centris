import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { MAPS_EMBED, SITE } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with CCF Centris at Eton Centris, EDSA corner Quezon Avenue, Quezon City.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Ask us anything."
        lead="A real person reads these. If it is something private or pastoral, there is a better route for that below."
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div className="max-w-2xl">
              <ContactForm />
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">Visit us</p>
                <address className="font-display mt-3 text-xl not-italic leading-snug">
                  {SITE.addressLines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </address>
                <ButtonLink
                  href="/visit/directions"
                  tone="outline"
                  size="sm"
                  full
                  className="mt-5"
                >
                  Directions
                </ButtonLink>
              </div>

              <div className="border border-hairline bg-paper-bright p-2">
                <iframe
                  title="Map showing CCF Centris"
                  src={MAPS_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-square w-full"
                />
              </div>

              <div className="border-l-2 border-clay bg-paper-bright p-6">
                <p className="label text-clay">Something private?</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  Prayer requests and pastoral conversations go through a
                  separate, confidential route rather than general enquiries.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href="/care/prayer"
                    className="label border border-ink px-4 py-2.5 text-center text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                  >
                    Request prayer
                  </Link>
                  <Link
                    href="/care/talk"
                    className="label border border-ink px-4 py-2.5 text-center text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                  >
                    Talk to someone
                  </Link>
                </div>
              </div>

              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">CCF nationwide</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  For anything beyond this center, CCF&rsquo;s main site covers
                  the wider movement.
                </p>
                <a
                  href="https://www.ccf.org.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="label mt-4 inline-block text-clay underline underline-offset-4"
                >
                  ccf.org.ph
                </a>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

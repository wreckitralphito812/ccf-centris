import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { CONTACT, MAPS_EMBED, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with CCF Centris at Eton Centris, EDSA corner Quezon Avenue, Quezon City.",
};

/**
 * "Leave a message" opens the visitor's own email app instead of posting a
 * form. No mail service is wired up yet, and a form that says "sent" without
 * delivering anything is worse than no form: people wait on a reply that was
 * never coming. A mailto link always arrives.
 */
const MESSAGE_HREF = `mailto:${CONTACT.messageEmail}?subject=${encodeURIComponent(
  "Message from the CCF Centris website",
)}`;

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Ask us anything."
        lead="Questions about Sunday, Dgroups, serving, or using the center — send them our way."
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div className="max-w-2xl">
              <dl className="divide-y divide-hairline border-y border-hairline">
                {CONTACT.officeHours ? (
                  <ContactRow label="Office hours">{CONTACT.officeHours}</ContactRow>
                ) : null}
                <ContactRow label="Email">
                  <a
                    href={`mailto:${CONTACT.messageEmail}`}
                    className="text-clay underline underline-offset-4"
                  >
                    {CONTACT.messageEmail}
                  </a>
                </ContactRow>
              </dl>

              <div className="mt-10">
                <h2 className="display-md">Leave us a message.</h2>
                <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
                  This opens your email app with a new message addressed to the
                  CCF Centris team.
                </p>
                <ButtonLink href={MESSAGE_HREF} size="lg" className="mt-6">
                  Leave a message
                </ButtonLink>
              </div>
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
                <p className="label text-clay">Need prayer?</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  The Prayer Wall is where the CCF Centris community prays for
                  one another.
                </p>
                <Link
                  href="/prayer-wall"
                  className="label mt-4 inline-block border border-ink px-4 py-2.5 text-center text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                >
                  Go to the Prayer Wall
                </Link>
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

function ContactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="label text-ink-mute">{label}</dt>
      <dd className="text-[1.02rem] text-ink">{children}</dd>
    </div>
  );
}

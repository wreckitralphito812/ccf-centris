import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { CONTACT, MAPS_EMBED, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Contact CCF Centris | Eton Centris, Quezon City" },
  description:
    "Reach CCF Centris at 2/F Centris Station, Eton Centris, EDSA corner Quezon Avenue, Quezon City. Message us on Facebook Messenger. Open daily 10 AM to 9 PM.",
};

/**
 * People reach the team through the CCF Centris Facebook page on Messenger
 * (Ralph, 2026-10-14). It replaced the email address and the signed-in
 * "Leave a message" mailto: the team answers Messenger faster, and every
 * message still comes from a real account.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Ask us anything."
        lead="Send us your questions about Sunday, Dgroups, serving, or using the center."
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div className="max-w-2xl">
              <dl className="divide-y divide-hairline border-y border-hairline">
                {CONTACT.officeHours ? (
                  <ContactRow label="Office hours">{CONTACT.officeHours}</ContactRow>
                ) : null}
                <ContactRow label="Message us">
                  <a
                    href={CONTACT.messenger}
                    target="_blank"
                    rel="noreferrer"
                    className="tap text-clay underline underline-offset-4"
                  >
                    CCF Centris on Messenger
                  </a>
                </ContactRow>
              </dl>

              <div className="mt-10">
                <h2 className="display-md">Message us.</h2>
                <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
                  Chat with the CCF Centris team on Facebook Messenger. We&rsquo;ll
                  reply there.
                </p>
                <ButtonLink href={CONTACT.messenger} target="_blank" rel="noreferrer" size="lg" className="mt-6">
                  Message us on Messenger
                </ButtonLink>
              </div>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="surface p-6">
                <p className="label text-clay">Visit us</p>
                <address className="font-display mt-3 text-xl not-italic leading-snug">
                  {SITE.addressLines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </address>
                <ButtonLink
                  href="/visit#getting-here"
                  tone="outline"
                  full
                  className="mt-5"
                >
                  Directions
                </ButtonLink>
              </div>

              <div className="surface p-2">
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
                  Post a request on the Prayer Wall and the church will pray for
                  you.
                </p>
                <ButtonLink href="/prayer-wall" tone="outline" full className="mt-4">
                  Go to the Prayer Wall
                </ButtonLink>
              </div>

              <div className="surface p-6">
                <p className="label text-clay">CCF nationwide</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  For other CCF centers and ministries, go to CCF&rsquo;s main
                  site.
                </p>
                <a
                  href="https://www.ccf.org.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="label tap mt-3 text-clay underline underline-offset-4"
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

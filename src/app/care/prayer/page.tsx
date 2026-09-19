import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { PrayerForm } from "./prayer-form";

export const metadata: Metadata = {
  title: "Request prayer",
  description:
    "Ask the CCF Centris prayer team to pray for you. Requests are private, can be sent anonymously, and are never published.",
  robots: { index: true, follow: true },
};

export default function PrayerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prayer"
        title="Need prayer? We'd be glad to pray with you."
        lead="Send it anonymously or with your name. Either way it stays between you and the prayer team."
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:items-start">
            <div className="max-w-2xl">
              <PrayerForm />
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">In person</p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  The prayer team stays at the front after every service. You do
                  not need to explain much, or anything at all.
                </p>
                <ButtonLink href="/visit#getting-here" tone="outline" size="sm" full className="mt-5">
                  Getting here
                </ButtonLink>
              </div>

              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">Something heavier?</p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  If you need to talk to a person rather than send a note, the
                  pastoral team handles that privately.
                </p>
                <ButtonLink href="/care/talk" tone="outline" size="sm" full className="mt-5">
                  Talk to someone
                </ButtonLink>
              </div>

              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">Urgent</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  This form is monitored during office hours and is not an
                  emergency service. If you or someone else is in immediate
                  danger, contact emergency services on 911.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

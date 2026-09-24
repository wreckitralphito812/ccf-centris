import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { TalkForm } from "./talk-form";

export const metadata: Metadata = {
  title: "Talk to someone",
  description:
    "Reach the CCF Centris pastoral team privately about faith, prayer, counselling, or anything else.",
};

export default function TalkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pastoral care"
        title="Talk to someone."
        lead="Someone from the pastoral team reads every message, and no one else sees it."
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:items-start">
            <div className="max-w-2xl">
              <TalkForm />
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="border-l-2 border-clay bg-paper-bright p-6">
                <p className="label text-clay">If it&rsquo;s urgent</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  This form is monitored during office hours. If you or someone
                  else is in immediate danger, please contact emergency services
                  on 911 rather than waiting for a reply here.
                </p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  The Philippines also has a national mental health crisis line
                  reachable through the Department of Health, and hospital
                  emergency departments are open at all hours.
                </p>
              </div>

              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">What happens next</p>
                <ol className="mt-3 space-y-2.5 text-[0.9rem] leading-relaxed text-ink-soft">
                  <li>A member of the pastoral team reads what you send.</li>
                  <li>They reply the way you asked to be contacted.</li>
                  <li>
                    If it would help, they arrange to meet, at the center or
                    somewhere else.
                  </li>
                  <li>
                    For counselling beyond what a pastor can offer, they can
                    point you to professionals.
                  </li>
                </ol>
              </div>

              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">Confidentiality</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  What you write reaches the pastoral team only. It is not
                  published, not discussed with other members, and not added to
                  any list. The one exception is where someone is at risk of
                  serious harm, where the team has a duty to act.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

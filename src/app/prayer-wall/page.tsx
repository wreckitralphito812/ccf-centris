import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Prayer Wall",
  description:
    "Post a prayer request and pray for others in the CCF Centris community.",
};

/**
 * Holding page. The Prayer Wall itself — screen names, requests that expire
 * after two months, prayers and messages left for each request — is designed
 * separately and lands in its own change. Until then this page says so plainly
 * instead of offering a form that goes nowhere.
 */
export default function PrayerWallPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prayer Wall"
        title="Pray for one another."
        lead="A place to post a prayer request, and to pray for others in the CCF Centris community."
      />
      <Section>
        <Container>
          <div className="max-w-2xl border-l-2 border-clay bg-paper-bright p-6">
            <p className="label text-clay">Opening soon</p>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-soft">
              We&rsquo;re building the Prayer Wall now. When it opens, you&rsquo;ll
              choose a screen name, post a request, and pray over the requests
              others have shared. Requests stay up for two months.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}

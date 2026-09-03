import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/page-header";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the CCF Centris website and booking system.",
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Terms"
        title="Terms of use."
        lead="The rules for using this site and the facilities you can book through it."
      />

      <Section>
        <Container>
          <Prose>
            <p className="text-[0.85rem] text-ink-mute">
              This is a working draft for the CCF Centris platform. It must be
              reviewed and approved by CCF before the site goes live.
            </p>

            <h2>Using this site</h2>
            <p>
              This site is operated by CCF Centris, a satellite center of
              Christ&rsquo;s Commission Fellowship. Content is provided for
              information and for arranging visits, events, and bookings.
            </p>

            <h2>Bookings and registrations</h2>
            <ul>
              <li>
                A court booking is confirmed once you receive a reference. A
                room request is not confirmed until the facilities team approves
                it.
              </li>
              <li>
                Cancel at least 24 hours ahead. Repeated no-shows may affect
                future bookings.
              </li>
              <li>
                Payment is settled directly with CCF through its own channels.
                No payment is taken through this site.
              </li>
              <li>
                CCF Centris may cancel or move a booking where the center is
                closed, a facility is unsafe, or a CCF-wide event requires the
                space. You will be told as early as possible.
              </li>
            </ul>

            <h2>Using the facilities</h2>
            <ul>
              <li>
                Follow the posted rules for each space, including footwear
                requirements on the sport floor.
              </li>
              <li>
                The person who makes a booking is responsible for their whole
                group, including anyone under 16.
              </li>
              <li>Report damage or injury to the desk immediately.</li>
              <li>
                CCF Centris is not responsible for personal property left in the
                center.
              </li>
            </ul>

            <h2>Conduct</h2>
            <p>
              Everyone using the center is expected to treat other people and
              the space with respect. CCF Centris may ask anyone behaving
              abusively, unsafely, or illegally to leave, and may decline future
              bookings.
            </p>

            <h2>Content</h2>
            <p>
              Messages, teaching materials, and 4Ws guides are provided for
              personal and Dgroup use. They may be shared freely for those
              purposes and should not be sold or republished commercially.
            </p>

            <h2>Accuracy</h2>
            <p>
              Schedules, availability, rates, and facility details can change.
              We keep this site current, but where something differs, the
              information given by the CCF Centris team in person is
              authoritative.
            </p>

            <h2>Changes</h2>
            <p>
              These terms may be updated. Continued use of the site or the
              facilities means accepting the current version.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}

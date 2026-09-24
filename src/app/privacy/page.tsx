import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How CCF Centris collects, uses, and protects personal information, in line with the Philippine Data Privacy Act of 2012.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="How we handle your information."
        lead="What we collect, why we collect it, and who can see it."
      />

      <Section>
        <Container>
          <Prose>
            <p className="text-[0.85rem] text-ink-mute">
              This notice is a working draft for the CCF Centris platform. It
              must be reviewed and approved by CCF before the site goes live.
            </p>

            <h2>What we collect</h2>
            <p>
              Only what a specific action needs. We do not ask for information
              on the chance it might be useful later.
            </p>
            <ul>
              <li>
                <strong>Planning a visit:</strong> optionally your name and
                email, so someone can meet you. You can skip both and still
                attend.
              </li>
              <li>
                <strong>Dgroup interest:</strong> name, email, optionally mobile
                and age bracket, so the Dgroup team can introduce you to a group.
              </li>
              <li>
                <strong>Event registration:</strong> name, email, party size,
                and optionally mobile.
              </li>
              <li>
                <strong>Reservations:</strong> name, email, mobile, and details
                of the activity, so the facilities team can run the booking.
              </li>
              <li>
                <strong>Volunteering:</strong> contact details and availability.
                Roles involving children or pastoral confidence additionally
                require a background check.
              </li>
              <li>
                <strong>Prayer and pastoral requests:</strong> whatever you
                choose to share. Prayer requests can be sent with no identifying
                information at all.
              </li>
            </ul>

            <h2>Who can see it</h2>
            <p>
              Access is limited by role, not granted to staff generally. A
              facilities administrator cannot read prayer requests. An events
              administrator cannot read pastoral requests. Prayer and pastoral
              requests are visible only to the prayer and pastoral care teams.
            </p>

            <h2>Children</h2>
            <p>
              Information about children is collected only for NXTGEN check-in
              and safety: name, age band, guardian contact, and any allergy or
              medical note you give us. It is used to keep your child safe and
              to reunite them with you, and for nothing else. It is never used
              for marketing and never shared outside the NXTGEN team.
            </p>

            <h2>What we never do</h2>
            <ul>
              <li>Publish prayer requests, pastoral requests, or giving records.</li>
              <li>Sell or rent personal information to anyone, for any purpose.</li>
              <li>Share a Dgroup leader&rsquo;s home address publicly.</li>
              <li>Add you to a mailing list because you filled in an unrelated form.</li>
              <li>Read a prayer request aloud without asking you first.</li>
            </ul>

            <h2>Your rights</h2>
            <p>
              Under the Philippine Data Privacy Act of 2012 (Republic Act No.
              10173) you have the right to be informed, to object, to access
              your data, to correct it, to have it erased or blocked, to data
              portability, and to damages. To exercise any of these, contact the
              CCF Centris team.
            </p>

            <h2>Security</h2>
            <p>
              Data is held in access-controlled systems with role-based
              permissions and audit logging. Sensitive records, particularly
              care requests and children&rsquo;s information, are restricted at
              the database level rather than only in the interface.
            </p>

            <h2>Retention</h2>
            <p>
              We keep information for as long as it serves the purpose it was
              given for, then delete it. Event registrations are cleared after
              the event and its reporting. Prayer requests are retained only as
              long as the team is praying for them.
            </p>

            <h2>Contact</h2>
            <p>
              For any question about your information, or to make a request,
              contact CCF Centris at {SITE.addressLines.join(", ")}, or through
              the <a href="/contact">contact page</a>.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}

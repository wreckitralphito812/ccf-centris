import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { CCF_POLICIES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "CCF's Privacy Policy, which CCF Centris follows: what personal information is collected, why, and how it's used and protected.",
};

/**
 * CCF's Privacy Policy, as published at ccf.org.ph/privacy-policy (copied
 * 2026-10-11). CCF Centris is part of CCF and follows it (Ralph). It's set in
 * the site's own type rather than embedded, which looked like another site
 * inside this one. CCF's wording is kept as published; if CCF updates its
 * policy, update this page to match.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="Privacy policy"
        lead="CCF Centris is part of Christ's Commission Fellowship and follows the CCF Privacy Policy."
      />

      <Section>
        <Container>
          <Prose>
            <p>
              We, at Christ&rsquo;s Commission Foundation, Inc., or Christ&rsquo;s Commission Fellowship
              (&ldquo;CCF&rdquo;) acknowledge and respect your right to privacy and the confidentiality of your
              Personal Information. As we collect, use, store, disclose, and dispose the information you provide
              to us, we are committed to be faithful stewards of this information by handling it in accordance
              with applicable laws and regulations and our CCF Privacy Policy as stated hereunder.
            </p>
            <p>
              It is within our Privacy Policy to take all necessary steps to ensure that personal information you
              provide is processed securely and lawfully.
            </p>
            <p>
              Only authorized personnel and third-party providers obliged to respect its confidentiality has access
              to all collected personal information. We neither sell, trade. or market any personal information
              supplied by you to any third party nor use any of the information you provide for commercial or
              other unrelated purposes.
            </p>
            <p>
              It is within our Policy to regularly monitor our internal procedures to ensure compliance with the
              relevant statutory requirements, including the general policies and procedures of Republic Act No.
              10173 or the Data Privacy Act of 2012 of the Philippines (the &ldquo;Data Privacy Act&rdquo;),
              relevant orders issued by the National Privacy Commission, and other applicable laws, rules, and
              regulations.
            </p>
            <p>
              This Privacy Policy covers CCF and its affiliate, Christ Commission Foundation Ministries, Inc.
              (&ldquo;CCFMI&rdquo;).
            </p>

            <h2>The types of information we collect</h2>
            <p>
              In participating in any CCF activity, it may be necessary for us, in pursuit of our legitimate
              interest as a religious organization and as an organizer of events, to collect personal information
              from you. Such personal information may include, but are not limited to the following:
            </p>
            <ul>
              <li>Your name</li>
              <li>Phone number and email address</li>
              <li>Residential address</li>
              <li>Age or life stage</li>
              <li>The CCF satellite you are a part of</li>
              <li>Your upline discipleship group leader&rsquo;s name and contact number</li>
              <li>Names and contact numbers of your discipleship group members</li>
              <li>Health or diet related concerns</li>
              <li>Your religious beliefs/ convictions</li>
              <li>Prayer requests</li>
              <li>Personal testimonies</li>
              <li>
                Photos or videos of you captured during worship services or church events/ activities for online
                streaming purposes, documentation, audio-visual presentations, and church event/activity
                promotions.
              </li>
            </ul>
            <p>
              Depending on the event or activity concerned, we may collect and process different personal
              information from you. If you have any concern on why we are requesting certain personal information,
              you may send your inquiry to us through the contact information provided below.
            </p>

            <h2>Why we collect personal information from you</h2>
            <p>
              Whether as a regular discipleship group member, a volunteer, or someone who is new to CCF, it is our
              hope that you would be able to know, experience, and grow in Christ through the church. It is our
              desire to provide a conducive spiritual atmosphere for all and to meet the needs of our
              members/participants across the different seasons or circumstances in life they are in. Our ability
              to meet those needs highly depends on understanding our members/participants, hence the necessity
              for us to collect personal information that would allow us to know our members better.
            </p>
            <p>Furthermore, we collect personal information from you for us to be able:</p>
            <ol>
              <li>To communicate with you, pray for you, and provide you with other services;</li>
              <li>To serve you and your family by providing worship and discipleship services;</li>
              <li>
                To review and improve our worship and discipleship services, including our websites, social
                networks, worship music, and communication materials;
              </li>
              <li>To contact you for any openings in our volunteer or full-time ministry work; and</li>
              <li>
                To use as material or content for online streaming purposes, documentation, audio-visual
                presentations, and church event/activity promotions
              </li>
            </ol>
            <p>
              Rest assured that we do not use your information in any way other than in the furtherance of our
              vision and mission as a church.
            </p>

            <h2>How we collect personal information from you</h2>
            <p>
              We collect your Personal Information by the voluntarily submission of the same to us through the
              following channels:
            </p>
            <ol>
              <li>The CCF website;</li>
              <li>Social media sites;</li>
              <li>CCF&rsquo;s mobile app;</li>
              <li>Forms including on-line registration forms and application forms;</li>
              <li>Cookies, Traffic Data, and Content Data;</li>
              <li>On-site Closed-Circuit Television;</li>
              <li>Photography or videography; and</li>
              <li>
                Other channels we use to serve you, such as:
                <ul className="mt-2">
                  <li>
                    Support groups, including CCF Staff, CCF Pastors, and CCF Volunteers via Chat Support, Facebook
                    Messenger, phone call, or electronic mail
                  </li>
                  <li>Availment of our Pastoral Care Services</li>
                  <li>Registration to our Global Leadership Center classes</li>
                  <li>Registration to our major events and retreats</li>
                </ul>
              </li>
            </ol>

            <h2>How we use your personal information</h2>
            <p>
              We guarantee that the information you have voluntarily provided will be used solely for the
              foregoing purposes for which it was collected, will be kept confidential in accordance with laws and
              CCF&rsquo;s Discipleship Covenant, and will not be disclosed without your consent, except for lawful
              reasons as provided under applicable laws. Any communications deemed privileged in nature shall be
              handled in accordance with the pertinent laws and judicial rules.
            </p>

            <h2>Who we share your personal information with</h2>
            <p>
              Disclosure of personal information shall be limited to pastors and authorized volunteers, or staff
              involved in the specific event or activity. It may also be disclosed to the members of our
              management, officers, and Board of Elders, on an as-needed basis.
            </p>
            <p>
              We will not share your personal information to third parties without your prior consent, except
              when legally required by the law or by the appropriate public authority, when needed to pursue a
              legitimate interest of the church, or when necessary for the protection of lawful rights and
              interests and for the establishment or exercise of or defense against legal claims of persons or the
              establishment in any proceedings.
            </p>
            <p>We will never share or disclose your information for commercial or non-related purposes.</p>

            <h2>How we protect your personal information</h2>
            <p>
              Reasonable steps have been set up to ensure the security of personal and sensitive information we
              obtain including the installation of organizational, physical, and technological safeguards for as
              long as they remain in our digital storage until such time they are no longer needed, but not
              exceeding ten (10) years from the date that said information is obtained. Additional steps will be
              taken to destroy or de-identify personal information that is no longer required.
            </p>
            <p>
              However, we disclaim any responsibility for any breach to the systems of service providers which run
              our system or host our cloud database caused by a systemic cybersecurity attack against such
              providers without the fault or negligence of our employees. In an event of such breach occur, we will
              inform you of any consequent compromise to your personal information within seventy-two (72) hours
              from the receipt of an official breach notification of our service provider.
            </p>

            <h2>Anonymity</h2>
            <p>
              We acknowledge and respect your right to be dealt with anonymously, and we will try to accommodate
              your request for anonymity wherever possible, lawful, and practicable. Please do note that in some
              circumstances, this may prevent us from effectively communicating with you.
            </p>

            <h2>Your rights</h2>
            <p>
              For a complete list of your right as data subjects, please go to:{" "}
              <a
                href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/#1"
                target="_blank"
                rel="noreferrer"
                className="break-words"
              >
                privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012
              </a>
            </p>

            <h2>Updating your personal information</h2>
            <p>
              Any changes on the Personal Information provided will only be made upon the receipt of the updates
              therein by CCF and/or upon the request thereof by the primary data subject. Upon update thereof, both
              the new and the retracted information and the simultaneous receipt of the new and the retracted
              information shall be made accessible to the recipients thereof. Authorized personnel and third-party
              providers who have previously received such processed personal information shall be informed of its
              inaccuracy and of its rectification upon reasonable request by the primary data subject.
            </p>
            <p>
              If you would like to update your personal information, please email our Data Protection Officer at{" "}
              <a href="mailto:privacy@ccf.org.ph">privacy@ccf.org.ph</a>.
            </p>

            <h2>Web cookies and encryption</h2>
            <p>
              A cookie automatically generated by the web server may be used on this site. This cookie contains no
              personal or identifying information and is destroyed once your browsing session is complete. The
              cookie is required as an integral part of the security of some surveys.
            </p>

            <h2>Questions about our Privacy Policy</h2>
            <p>
              If you have any questions or clarification about our Privacy Policy, you may contact our Data
              Protection Officer at <a href="tel:+6328669900">(02) 866-9900</a> or email us at{" "}
              <a href="mailto:privacy@ccf.org.ph">privacy@ccf.org.ph</a>.
            </p>
            <p>If you feel that we are in breach of this privacy statement, you may contact us by any of the above methods.</p>

            <p className="border-t border-hairline pt-6 text-[0.9rem] text-ink-mute">
              From CCF&rsquo;s Privacy Policy at{" "}
              <a href={CCF_POLICIES.privacy} target="_blank" rel="noreferrer">
                ccf.org.ph/privacy-policy
              </a>
              .
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}

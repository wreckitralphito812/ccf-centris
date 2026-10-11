import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { CCF_POLICIES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "CCF's Terms and Conditions, which CCF Centris and this website follow: license, user content, acceptable use and more.",
};

/**
 * CCF's Terms and Conditions, as published at ccf.org.ph/terms-and-conditions
 * (copied 2026-10-11). CCF Centris is part of CCF and follows them (Ralph).
 * Set in the site's own type rather than embedded. "The CCF Website" covers
 * this site too. CCF's wording is kept as published; if CCF updates its
 * terms, update this page to match.
 */
export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Terms"
        title="Terms and conditions"
        lead="CCF Centris is part of Christ's Commission Fellowship and follows the CCF Terms and Conditions."
      />

      <Section>
        <Container>
          <Prose>
            <p>
              The CCF Website is an online information platform that allows its visitors to view and/or download
              relevant materials, updates, news and events from CCF. It also serves as a link page to other CCF
              applications and social media sites that can specifically cater to the needs of CCF members.
            </p>

            <h2>Statement of Rights and Responsibilities</h2>
            <p>
              This Statement of Rights and Responsibilities (the &ldquo;Statement&rdquo;) shall govern your use of
              this website including all pages found herein. By using or accessing the CCF Website platform and
              related services, you agree to be bound by the terms and conditions of this Statement and our{" "}
              <Link href="/privacy">Privacy Policy</Link>, as maybe updated from time to time.
            </p>

            <h2>1. License to use</h2>
            <p>
              Unless otherwise stated, CCF owns all the intellectual property found on this Website and reserves
              the right to use the same. You are permitted to download, cache, print, and redistribute pages for
              your personal use and evangelism, or for discussion within your respective Bible study groups,
              subject to the following conditions.
            </p>
            <p>You must not:</p>
            <ul>
              <li>Sell, rent, or sub-license any material from the CCF Website</li>
              <li>Reproduce, duplicate, copy, print, or exploit material for commercial purposes</li>
              <li>
                Modify, alter, edit or change any material from the Website, including but not limited to the
                4W&rsquo;s., CCF Online Gospel Tracts, videos, audio-visual material, or images published and owned
                exclusively by CCF.
              </li>
              <li>Claim ownership over, or plagiarize any material made available on the CCF Website.</li>
            </ul>

            <h2>2. User content</h2>
            <p>
              By uploading User Content (such as, but not limited to texts, images, videos, and audio-visual
              material) onto the CCF Website for whatever purpose, you grant CCF an irrevocable, non-exclusive,
              royalty-free right to use, reproduce, or publish the same.
            </p>

            <h2>3. Privacy</h2>
            <p>
              Your privacy is very important to us. We have set in place the appropriate processes and technologies
              to safeguard your personal information. Only information relevant to the services you use will be
              stored and made available to selected and authorized CCF personnel. Please refer to our{" "}
              <Link href="/privacy">Privacy Policy here</Link>.
            </p>

            <h2>4. Acceptable use and safety</h2>
            <p>
              While we may do our best to keep the CCF Website safe, we cannot guarantee the complete security of
              your personal data, unless with your full cooperation. When accessing and using the CCF Website, you
              are prohibited from performing any of the following acts:
            </p>
            <ul>
              <li>
                Collecting users&rsquo; content or information, or otherwise accessing the CCF Website, using
                automated means (such as but not limited to harvesting bots, robots, spiders, or scrapers) without
                CCF&rsquo;s prior written permission.
              </li>
              <li>Uploading viruses or other malicious codes.</li>
              <li>Soliciting login information or accessing an account belonging to someone else.</li>
              <li>
                Posting content that may be classified as threatening, violent, inciting to violence, hateful, or
                pornographic. You are prohibited from posting material that ; contains nudity or graphic images of
                violence.
              </li>
              <li>
                Using the CCF Website for unlawful, illegal, unauthorized, misleading, malicious, obscene, offensive
                or discriminatory acts.
              </li>
              <li>
                Using the CCF website in any way that disables, overburdens, or impairs the appearance or proper
                functioning of the CCF Website, such as but not limited to conducting a denial-of-service attack or
                interference with page rendering or other CCF Website functionality.
              </li>
              <li>Conducting, facilitating, or encouraging any violations of this Statement or CCF policies.</li>
              <li>Infringing the copyright, database right or trademark of CCF or any other person or entity.</li>
            </ul>

            <h2>5. Privacy security</h2>
            <p>
              For transparency and accountability, we require CCF Website users to provide their real names and
              information. In order to maintain the safety and security of your account, you are prohibited from
              performing the following terms:
            </p>
            <ol>
              <li>You may not provide information that is fictitious</li>
              <li>You may not use information belonging to someone else, without their permission.</li>
              <li>
                You may not select an inappropriate username or group name. CCF reserves the right, at its sole
                discretion, to modify or delete any Username or group name with inappropriate or unlawful content.
              </li>
              <li>You allow CCF to use your non-proprietary information for accounting and regulatory purposes.</li>
            </ol>

            <h2>6. Protecting other people&rsquo;s rights</h2>
            <p>
              We respect other people&rsquo;s rights and expect you to do the same. We reserve the right to remove
              any content or information posted on the CCF Website that, to our sole discretion, violates this
              Statement, CCF policies,, and/or any applicable laws.
            </p>

            <h2>7. Amendments</h2>
            <p>
              This Statement, and any policies, guidelines or other terms referenced in or incorporated by this
              Statement, is subject to change without prior notice. Your continued use of CCF Website and its
              related services constitutes your acceptance of our amended terms, policies or guidelines.
            </p>

            <h2>8. Termination</h2>
            <p>
              If you violate the letter or spirit of this Statement, or otherwise create risk of possible legal
              liability for CCF, we reserve the right to immediately terminate or suspend your access to the CCF
              Website, without prior notice. This is without prejudice to other rights and remedies we may avail of
              under applicable laws.
            </p>

            <h2>9. Disputes, liability and indemnity</h2>
            <p>
              If anyone brings a claim against us related to your actions, content or information on the CCF
              Website, you will indemnify and hold us harmless from and against all damages, losses, and expenses
              of any kind (including reasonable legal fees and costs) related to such claim. Although we provide
              rules for user conduct, we do not control or direct users&rsquo; actions on the CCF Website and are
              not responsible for the content or information users transmit or share on the CCF Website. We are not
              responsible for any offensive, inappropriate, obscene, unlawful or otherwise objectionable content or
              information you may encounter on the CCF Website. We are not responsible for the conduct, whether
              online or offline, of any user of the CCF Website.
            </p>
            <p>
              We try to keep the CCF Website up, bug-free, and safe. We do not guarantee that the CCF Website will
              always be safe, secure or error-free or that CCF Website will always function without disruptions,
              delays or imperfections. CCF is not responsible for the actions, content, information, or data of
              third parties, and you release us, our directors, officers, employees, and agents from any claims and
              damages, known and unknown, arising out of or in any way connected with any claim you have against
              any such third parties.
            </p>

            <p className="border-t border-hairline pt-6 text-[0.9rem] text-ink-mute">
              From CCF&rsquo;s Terms and Conditions at{" "}
              <a href={CCF_POLICIES.terms} target="_blank" rel="noreferrer">
                ccf.org.ph/terms-and-conditions
              </a>
              .
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}

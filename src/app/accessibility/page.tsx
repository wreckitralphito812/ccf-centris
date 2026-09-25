import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/page-header";
import { ButtonLink, Container, Section, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Accessibility at CCF Centris: step-free access, accessible seating and washrooms, assisted listening, and how to tell us what you need.",
};

export default function AccessibilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Accessibility"
        title="Getting around the center."
        lead="What the center provides, what this website does, and how to tell us if something is not working for you."
        actions={
          <ButtonLink href="/contact" size="lg">
            Tell us what you need
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          <SectionHead eyebrow="The building" title="At CCF Centris" />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                "Step-free access",
                "From the Centris Station concourse to the second floor, with lift access throughout. No stairs are required at any point.",
              ],
              [
                "PWD drop-off",
                "Use the covered drop-off closest to the concourse entrance. Tell us when you plan your visit and someone will meet you there.",
              ],
              [
                "Accessible seating",
                "Wheelchair spaces with companion seats at the rear and side bays of the Main Worship Hall.",
              ],
              [
                "Accessible washrooms",
                "On the same floor as the worship hall, close to the main entrance.",
              ],
              [
                "Assisted listening",
                "Available from the Welcome Center before each service.",
              ],
              [
                "Service animals",
                "Welcome throughout the center, including the worship hall and the sports hall.",
              ],
              [
                "Sports Hall viewing",
                "Step-free entry with wheelchair spaces in the spectator area.",
              ],
              [
                "Quiet space",
                "If a service becomes overwhelming, ask any volunteer and they will show you somewhere quieter.",
              ],
              [
                "Large-print materials",
                "Available on request at the Welcome Center.",
              ],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-6">
                <h3 className="font-display text-lg">{t}</h3>
                <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
                  {b}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <Prose>
            <h2>This website</h2>
            <p>
              We build to the Web Content Accessibility Guidelines, aiming at
              level AA. In practice that means:
            </p>
            <ul>
              <li>
                Every function works with a keyboard alone, with a visible focus
                indicator.
              </li>
              <li>
                Proper headings and page landmarks, so screen readers can find
                their way around.
              </li>
              <li>
                Text contrast of at least 4.5 to 1.
              </li>
              <li>
                Alternative text on meaningful images, and decorative graphics
                hidden from assistive technology.
              </li>
              <li>
                Forms with real labels, clear error messages, and no reliance on
                colour alone.
              </li>
              <li>
                Animations switch off if your device is set to reduce motion.
              </li>
              <li>Buttons and links big enough to tap easily.</li>
            </ul>

            <h2>Where we fall short</h2>
            <p>
              Captions on message videos depend on what has been uploaded, and
              older messages may not have them yet. Sermon transcripts are being
              added over time. If a specific message matters to you and lacks
              captions, ask us and we will prioritise it.
            </p>

            <h2>Tell us</h2>
            <p>
              If something on this site or in the building doesn&rsquo;t work
              for you, please tell us. Use the{" "}
              <a href="/contact">contact page</a>, or tell anyone at the Welcome
              Center. You don&rsquo;t need to explain why you need something.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}

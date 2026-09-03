import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section, SectionHead } from "@/components/ui";
import { FacilityCard } from "@/components/cards";
import { getFacilities } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Facilities",
  description:
    "Every space at CCF Centris: worship hall, sports hall, four multipurpose halls, Dgroup lounge, and welcome center. Capacities, layouts, and reservation details.",
};

export default async function FacilitiesPage() {
  const facilities = await getFacilities();
  const reservable = facilities.filter((f) => f.is_reservable);
  const other = facilities.filter((f) => !f.is_reservable);

  return (
    <>
      <PageHeader
        eyebrow="Facilities"
        title="Every space at Centris."
        lead="Capacities, layouts, amenities, and whether you can book it. Rates and rules are set by the CCF Centris team."
        actions={
          <>
            <ButtonLink href="/centris/reserve" size="lg">
              Reserve a space
            </ButtonLink>
            <ButtonLink href="/centris/availability" tone="outline" size="lg">
              Check availability
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHead
            eyebrow="Available to book"
            title="Reservable spaces"
            lead="Open to CCF ministries, members, and the wider community. Some need approval before they are confirmed."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reservable.map((f) => (
              <FacilityCard key={f.id} f={f} />
            ))}
          </div>
        </Container>
      </Section>

      {other.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead
              eyebrow="Also at Centris"
              title="Other spaces"
              lead="Held for services and center operations rather than general booking."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {other.map((f) => (
                <FacilityCard key={f.id} f={f} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

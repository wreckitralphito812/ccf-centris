import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { getUpcomingServices } from "@/lib/queries";
import { PlanWizard } from "./plan-wizard";

export const metadata: Metadata = {
  title: "Plan your visit",
  description:
    "Tell us you're coming to CCF Centris and we'll have someone ready to meet you. Choose a service, get directions, and save it to your calendar.",
};

export default async function PlanPage() {
  const services = await getUpcomingServices(6);

  return (
    <>
      <PageHeader
        eyebrow="Plan your visit"
        title="Let us know you're coming."
        lead="Takes about a minute. You never have to do this to attend, it just means someone is expecting you."
      />
      <Section>
        <Container>
          <PlanWizard services={services} />
        </Container>
      </Section>
    </>
  );
}

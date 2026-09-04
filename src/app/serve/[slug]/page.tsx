import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  ButtonLink,
  Container,
  DetailRow,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { VolunteerCard } from "@/components/cards";
import { getVolunteerRole, getVolunteerRoles } from "@/lib/queries";
import { ApplyForm } from "./apply";

export async function generateStaticParams() {
  return (await getVolunteerRoles()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/serve/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getVolunteerRole(slug);
  if (!r) return { title: "Role not found" };
  return { title: r.title, description: r.description ?? undefined };
}

/** Roles where a background check is mandatory, not a nice-to-have. */
const SCREENED = new Set(["NXTGEN", "Elevate", "Prayer"]);

export default async function VolunteerRolePage({
  params,
}: PageProps<"/serve/[slug]">) {
  const { slug } = await params;
  const role = await getVolunteerRole(slug);
  if (!role) notFound();

  const all = await getVolunteerRoles();
  const sameTeam = all
    .filter((r) => r.ministry === role.ministry && r.slug !== role.slug)
    .slice(0, 3);

  const screened = role.ministry ? SCREENED.has(role.ministry) : false;

  return (
    <>
      <PageHeader
        eyebrow={role.ministry ?? "Serve"}
        title={role.title}
        lead={role.description ?? undefined}
      />

      <Section>
        <Container>
          <Breadcrumbs
            className="mb-8"
            items={[
              { label: "Serve", href: "/serve" },
              { label: role.title },
            ]}
          />

          <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                {role.is_open ? (
                  <Pill tone="moss">Open now</Pill>
                ) : (
                  <Pill tone="muted">Currently full</Pill>
                )}
                {screened ? <Pill tone="clay">Background check required</Pill> : null}
              </div>

              <dl className="mt-8">
                {role.commitment ? (
                  <DetailRow label="Commitment">{role.commitment}</DetailRow>
                ) : null}
                {role.schedule_note ? (
                  <DetailRow label="When">{role.schedule_note}</DetailRow>
                ) : null}
                {role.requirements ? (
                  <DetailRow label="Requirements">{role.requirements}</DetailRow>
                ) : null}
                {role.training_note ? (
                  <DetailRow label="Training">{role.training_note}</DetailRow>
                ) : null}
                {role.ministry ? (
                  <DetailRow label="Team">{role.ministry}</DetailRow>
                ) : null}
              </dl>

              <div className="mt-10 border border-hairline bg-paper-bright p-7">
                <h2 className="font-display text-2xl">What a shift looks like</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  You arrive before the room opens, meet the rest of the team,
                  and get a quick brief on anything unusual that week. Afterwards
                  the team resets the space and usually eats together.
                </p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  For your first few shifts you are paired with someone
                  experienced. Nobody is left to work out a role alone.
                </p>
              </div>

              {screened ? (
                <div className="mt-6 border-l-2 border-clay bg-paper-bright py-4 pl-5 pr-4">
                  <p className="label text-clay">Safeguarding</p>
                  <p className="mt-1.5 leading-relaxed text-ink-soft">
                    This role involves children or pastoral confidence. A
                    background check and formal training are required before a
                    first shift, and no volunteer is ever alone with a child.
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-28">
              <ApplyForm
                roleId={role.id}
                roleTitle={role.title}
                screened={screened}
              />
            </aside>
          </div>
        </Container>
      </Section>

      {sameTeam.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead
              eyebrow={role.ministry ?? "Serve"}
              title="Other roles on this team"
              action={
                <ButtonLink href="/serve" tone="outline">
                  All roles
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sameTeam.map((r) => (
                <VolunteerCard key={r.id} r={r} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

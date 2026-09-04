import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { DgroupCard, EventCard, VolunteerCard } from "@/components/cards";
import {
  getCommunities,
  getCommunity,
  getDgroupsForCommunity,
  getEventsForCommunity,
  getVolunteerRolesForMinistry,
} from "@/lib/queries";
import { communityDetail } from "@/data/community-detail";

export async function generateStaticParams() {
  return (await getCommunities()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/communities/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c) return { title: "Community not found" };
  return {
    title: c.name,
    description: c.description ?? c.tagline ?? undefined,
  };
}

export default async function CommunityPage({
  params,
}: PageProps<"/communities/[slug]">) {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c) notFound();

  const detail = communityDetail[slug];

  const [dgroups, events, roles] = await Promise.all([
    getDgroupsForCommunity(slug),
    getEventsForCommunity(slug),
    detail?.serveMinistry
      ? getVolunteerRolesForMinistry(detail.serveMinistry)
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={c.life_stage ?? "Community"}
        title={c.name}
        lead={c.description ?? c.tagline ?? undefined}
        tone="ink"
        actions={
          <>
            <ButtonLink
              href="/grow/find-a-dgroup"
              size="lg"
                tone="on-dark"
            >
              Find a Dgroup
            </ButtonLink>
            <ButtonLink
              href="/events"
              tone="ghost-on-dark"
              size="lg"
            >
              What&rsquo;s on →
            </ButtonLink>
          </>
        }
      />

      <div className="border-b border-hairline bg-paper-bright">
        <Container className="py-4">
          <Breadcrumbs
            items={[
              { label: "Communities", href: "/communities" },
              { label: c.name },
            ]}
          />
        </Container>
      </div>

      {c.meeting_note ? (
        <div className="border-b border-hairline bg-paper-bright">
          <Container className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
            <Eyebrow>When we meet</Eyebrow>
            <p className="text-[0.95rem] text-ink">{c.meeting_note}</p>
            <Link
              href="/visit/directions"
              className="label ml-auto text-clay underline underline-offset-4"
            >
              Getting here
            </Link>
          </Container>
        </div>
      ) : null}

      {/* What it's actually like */}
      {detail?.experience.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="What it's like"
              title={`Coming to ${c.name}`}
            />
            <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {detail.experience.map((e, i) => (
                <div key={e.title} className="bg-paper-bright p-7">
                  <p className="font-display text-4xl leading-none text-clay/25">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display mt-4 text-xl">{e.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{e.body}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Age bands */}
      {detail?.bands?.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead eyebrow="Age groups" title="Who goes where" />
            <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              {detail.bands.map((b) => (
                <div key={b.label} className="bg-paper-bright p-6">
                  <p className="label text-clay">{b.note}</p>
                  <h3 className="font-display mt-2 text-2xl">{b.label}</h3>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Events */}
      {events.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="Coming up"
              title={`${c.name} events`}
              action={
                <ButtonLink href="/events" tone="outline">
                  All events
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Dgroups */}
      {dgroups.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead
              eyebrow="Dgroups"
              title="Groups in this community"
              lead="A community is where you meet people. A Dgroup is the handful you actually grow with."
              action={
                <ButtonLink href="/grow/find-a-dgroup" tone="outline">
                  All Dgroups
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dgroups.map((d) => (
                <DgroupCard key={d.id} d={d} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Callout */}
      {detail?.callout ? (
        <Section className="py-12">
          <Container>
            <div className="flex flex-col gap-6 border border-clay bg-clay/8 p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-2xl">{detail.callout.title}</h2>
                <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
                  {detail.callout.body}
                </p>
              </div>
              <ButtonLink href={detail.callout.href} className="shrink-0">
                {detail.callout.cta}
              </ButtonLink>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Serve */}
      {roles.length ? (
        <Section tone="bright">
          <Container>
            <SectionHead
              eyebrow="Serve"
              title={`Serve with ${c.name}`}
              lead="Most people find their place by helping with the thing they already turn up to."
              action={
                <ButtonLink href="/serve" tone="outline">
                  All ministries
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((r) => (
                <VolunteerCard key={r.id} r={r} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* FAQs */}
      {detail?.faqs.length ? (
        <Section>
          <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <Eyebrow>Questions</Eyebrow>
                <h2 className="display-md mt-5">
                  The things people ask first.
                </h2>
                <p className="mt-5 leading-relaxed text-ink-soft">
                  If yours is not here, ask anyone at the Welcome Center or send
                  us a note.
                </p>
                <ButtonLink href="/contact" tone="outline" className="mt-7">
                  Ask a question
                </ButtonLink>
              </div>
              <dl className="divide-y divide-hairline border-y border-hairline">
                {detail.faqs.map((f) => (
                  <div key={f.q} className="py-5">
                    <dt className="font-display text-lg">{f.q}</dt>
                    <dd className="mt-1.5 leading-relaxed text-ink-soft">
                      {f.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Next steps */}
      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">New to {c.name}?</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                Come to a gathering without telling anyone first. Check when we
                meet, and we will look for you at the door.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/visit/service-times"
                tone="on-dark"
              >
                Service times
              </ButtonLink>
              <ButtonLink
                href="/communities"
                tone="ghost-on-dark"
              >
                Other communities →
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

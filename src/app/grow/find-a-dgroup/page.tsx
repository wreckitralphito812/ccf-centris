import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, EmptyState, Section } from "@/components/ui";
import { DgroupCard } from "@/components/cards";
import { findDgroups, getCommunities } from "@/lib/queries";
import { DgroupFinder } from "./finder";

export const metadata: Metadata = {
  title: "Find a Dgroup",
  description:
    "Find a Dgroup at CCF Centris. Filter by day, life stage, language, and whether you want to meet in person or online.",
};

export default async function FindDgroupPage({
  searchParams,
}: PageProps<"/grow/find-a-dgroup">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? undefined;

  const [groups, all, communities] = await Promise.all([
    findDgroups({
      q: one(sp.q),
      audience: one(sp.audience),
      mode: one(sp.mode),
      day: one(sp.day),
      language: one(sp.language),
      community: one(sp.community),
    }),
    findDgroups({}),
    getCommunities(),
  ]);

  const languages = [...new Set(all.map((d) => d.language))].sort();

  return (
    <>
      <PageHeader
        eyebrow="Find a Dgroup"
        title="Find a Dgroup near Centris."
        lead="Pick a group and send a note. The Dgroup team will connect you."
      />

      <Section>
        <Container>
          <Suspense fallback={<div className="h-52" />}>
            <DgroupFinder
              total={groups.length}
              languages={languages}
              communities={communities.map((c) => ({
                slug: c.slug,
                name: c.name,
              }))}
            />
          </Suspense>

          {groups.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((d) => (
                <DgroupCard key={d.id} d={d} />
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="No groups match that combination."
                body="Try removing a filter. If nothing fits your schedule, tell us and the Dgroup team will help you find or start one."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <ButtonLink href="/grow/find-a-dgroup" tone="outline">
                      Clear filters
                    </ButtonLink>
                    <ButtonLink href="/grow/join-a-dgroup">
                      Ask for help
                    </ButtonLink>
                  </div>
                }
              />
            </div>
          )}

          <p className="mt-10 max-w-2xl text-[0.85rem] leading-relaxed text-ink-mute">
            For privacy, we show a general meeting area and a leader&rsquo;s
            first name only. Exact addresses and contact details are shared
            after the Dgroup team has connected you with the group.
          </p>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="flex flex-col gap-6 border border-hairline bg-paper-bright p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl">
                Help choosing a group
              </h2>
              <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">
                Tell us your schedule and what stage of life you&rsquo;re in, and
                someone from the Dgroup team will suggest a few groups.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/grow/join-a-dgroup">How Dgroups work</ButtonLink>
              <ButtonLink href="/contact" tone="outline">
                Ask us
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, DetailRow, Pill, Section } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { DgroupCard } from "@/components/cards";
import { findDgroups, getDgroup } from "@/lib/queries";
import { AUDIENCE_LABEL, MODE_LABEL, dayName } from "@/lib/format";
import { InterestForm } from "./interest-form";

export async function generateStaticParams() {
  const all = await findDgroups({});
  return all.map((d) => ({ id: d.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/grow/find-a-dgroup/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await getDgroup(id);
  if (!d) return { title: "Dgroup not found" };
  return {
    title: d.name,
    description: d.description ?? `A Dgroup meeting at CCF Centris.`,
  };
}

export default async function DgroupPage({
  params,
}: PageProps<"/grow/find-a-dgroup/[id]">) {
  const { id } = await params;
  const d = await getDgroup(id);
  if (!d) notFound();

  const similar = (await findDgroups({ audience: d.audience }))
    .filter((o) => o.id !== d.id)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Dgroup"
        title={d.name}
        lead={d.description ?? undefined}
      />

      <Section>
        <Container>
          <nav aria-label="Breadcrumb" className="mb-8">
            <Link
              href="/grow/find-a-dgroup"
              className="label text-ink-mute transition-colors hover:text-clay"
            >
              ← All Dgroups
            </Link>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="clay">{AUDIENCE_LABEL[d.audience]}</Pill>
                <Pill tone="muted">{MODE_LABEL[d.mode]}</Pill>
                <Pill tone="muted">{d.language}</Pill>
                {d.seats_left !== null && d.seats_left > 0 ? (
                  <Pill tone="moss">{d.seats_left} spaces left</Pill>
                ) : null}
              </div>

              <dl className="mt-8">
                <DetailRow label="Meets">
                  {dayName(d.day_of_week)}
                  {d.start_time ? `, ${to12h(d.start_time)}` : ""}
                </DetailRow>
                <DetailRow label="General area">
                  {d.general_area ?? "Shared once you connect"}
                </DetailRow>
                <DetailRow label="Led by">
                  {d.leader_first_name ?? "A trained Dgroup leader"}
                </DetailRow>
                <DetailRow label="Life stage">
                  {AUDIENCE_LABEL[d.audience]}
                  {d.age_min || d.age_max
                    ? ` · roughly ${d.age_min ?? ""}${d.age_min && d.age_max ? "–" : ""}${d.age_max ?? "+"}`
                    : ""}
                </DetailRow>
                <DetailRow label="Format">{MODE_LABEL[d.mode]}</DetailRow>
                <DetailRow label="Language">{d.language}</DetailRow>
              </dl>

              <div className="mt-10 border border-hairline bg-paper-bright p-7">
                <h2 className="font-display text-2xl">What happens at a Dgroup</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  Most groups run about ninety minutes and follow the 4Ws:
                  a welcome question that gets everyone talking, worship and
                  prayer, working through the passage from Sunday, and one
                  concrete step each person takes before the next meeting.
                </p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  You will not be asked to read aloud, pray aloud, or share
                  anything you would rather keep to yourself. Turning up is
                  enough for the first few weeks.
                </p>
                <Link
                  href="/grow/join-a-dgroup"
                  className="label mt-5 inline-block text-clay underline underline-offset-4"
                >
                  More about how Dgroups work
                </Link>
              </div>
            </div>

            <aside className="border border-hairline bg-paper-bright p-7 lg:sticky lg:top-28">
              <h2 className="font-display text-2xl leading-tight">
                I&rsquo;m interested in joining
              </h2>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                Send a note and the Dgroup team will introduce you.
              </p>
              <div className="mt-6">
                <InterestForm dgroupName={d.name} />
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {similar.length ? (
        <Section tone="deep">
          <Container>
            <h2 className="display-md">Similar groups</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <DgroupCard key={s.id} d={s} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

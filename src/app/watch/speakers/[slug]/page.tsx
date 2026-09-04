import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, EmptyState, Section } from "@/components/ui";
import { MessageCard } from "@/components/cards";
import { findMessages, getSpeakerBySlug, getSpeakers } from "@/lib/queries";

/** Live from CCF's channel: refresh hourly so new messages appear
 *  without a redeploy, and resolve slugs published since the last build. */
export const revalidate = 3600;
export const dynamicParams = true;


export async function generateStaticParams() {
  return (await getSpeakers()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/watch/speakers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSpeakerBySlug(slug);
  if (!s) return { title: "Speaker not found" };
  return { title: s.name, description: s.bio ?? undefined };
}

export default async function SpeakerPage({
  params,
}: PageProps<"/watch/speakers/[slug]">) {
  const { slug } = await params;
  const s = await getSpeakerBySlug(slug);
  if (!s) notFound();

  const messages = await findMessages({ speaker: slug });

  return (
    <>
      <PageHeader
        eyebrow={s.role_title ?? "Speaker"}
        title={s.name}
        lead={s.bio ?? undefined}
        actions={
          <Link
            href="/watch/speakers"
            className="label inline-flex items-center border border-ink px-7 py-3.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            ← All speakers
          </Link>
        }
      />

      <Section>
        <Container>
          <Breadcrumbs
            className="mb-8"
            items={[
              { label: "Watch", href: "/watch" },
              { label: "Speakers", href: "/watch/speakers" },
              { label: s.name },
            ]}
          />
          <p className="label mb-8 text-ink-mute">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </p>
          {messages.length ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {messages.map((m) => (
                <MessageCard key={m.id} m={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No messages yet."
              body="Messages appear here once they are published."
            />
          )}
        </Container>
      </Section>
    </>
  );
}

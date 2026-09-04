import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, EmptyState, Section } from "@/components/ui";
import { MessageCard } from "@/components/cards";
import { findMessages, getSeries, getSeriesBySlug } from "@/lib/queries";
import { fmtDate } from "@/lib/format";

/** Live from CCF's channel: refresh hourly so new messages appear
 *  without a redeploy, and resolve slugs published since the last build. */
export const revalidate = 3600;
export const dynamicParams = true;


export async function generateStaticParams() {
  return (await getSeries()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/watch/series/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSeriesBySlug(slug);
  if (!s) return { title: "Series not found" };
  return { title: s.title, description: s.description ?? undefined };
}

export default async function SeriesPage({
  params,
}: PageProps<"/watch/series/[slug]">) {
  const { slug } = await params;
  const s = await getSeriesBySlug(slug);
  if (!s) notFound();

  const messages = await findMessages({ series: slug, sort: "oldest" });

  return (
    <>
      <PageHeader
        eyebrow={s.subtitle ?? "Series"}
        title={s.title}
        lead={s.description ?? undefined}
        actions={
          <Link
            href="/watch/series"
            className="label inline-flex items-center border border-ink px-7 py-3.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            ← All series
          </Link>
        }
      />

      <Section>
        <Container>
          <Breadcrumbs
            className="mb-8"
            items={[
              { label: "Watch", href: "/watch" },
              { label: "Series", href: "/watch/series" },
              { label: s.title },
            ]}
          />
          {s.starts_on ? (
            <p className="label mb-8 text-ink-mute">
              {fmtDate(s.starts_on)}
              {s.ends_on ? ` – ${fmtDate(s.ends_on)}` : ""} ·{" "}
              {messages.length} {messages.length === 1 ? "message" : "messages"}
            </p>
          ) : null}

          {messages.length ? (
            <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {messages.map((m, i) => (
                <li key={m.id}>
                  <p className="label mb-2 text-clay">
                    Part {String(i + 1).padStart(2, "0")}
                  </p>
                  <MessageCard m={m} />
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Nothing published yet."
              body="Messages appear here as they are added after each Sunday."
            />
          )}
        </Container>
      </Section>
    </>
  );
}

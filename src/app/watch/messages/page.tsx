import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, EmptyState, Section } from "@/components/ui";
import { MessageCard } from "@/components/cards";
import { findMessages, getMessageFacets } from "@/lib/queries";
import { MessageFilters } from "./filters";

/** Live from CCF's channel: refresh hourly so new messages appear
 *  without a redeploy. */
export const revalidate = 3600;


export const metadata: Metadata = {
  title: "Messages",
  description:
    "Every message from CCF Centris. Filter by series, speaker, topic, Bible book, or year, and open the 4Ws for your Dgroup.",
};

export default async function MessagesPage({
  searchParams,
}: PageProps<"/watch/messages">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? undefined;

  const [messages, facets] = await Promise.all([
    findMessages({
      q: one(sp.q),
      series: one(sp.series),
      speaker: one(sp.speaker),
      topic: one(sp.topic),
      book: one(sp.book),
      year: one(sp.year),
      sort: one(sp.sort) === "oldest" ? "oldest" : "newest",
    }),
    getMessageFacets(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Every message, whenever you need it."
        lead="Search the archive, follow a series from the start, or find something on a specific topic."
      />

      <Section>
        <Container>
          <Suspense fallback={<div className="h-40" />}>
            <MessageFilters
              facets={{
                topics: facets.topics,
                books: facets.books,
                years: facets.years,
                series: facets.series.map((s) => ({ slug: s.slug, title: s.title })),
                speakers: facets.speakers.map((s) => ({ slug: s.slug, name: s.name })),
              }}
              total={messages.length}
            />
          </Suspense>

          {messages.length ? (
            <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {messages.map((m) => (
                <MessageCard key={m.id} m={m} />
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="No messages match that."
                body="Try removing a filter, or search for a broader word like anxiety, family, or money."
                action={
                  <ButtonLink href="/watch/messages" tone="outline">
                    Clear filters
                  </ButtonLink>
                }
              />
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}

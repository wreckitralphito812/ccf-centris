import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  EmptyState,
  Pill,
  Section,
} from "@/components/ui";
import { globalSearch } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search everything at CCF Centris: messages, events, Dgroups, communities, facilities, GLC classes, and FAQs.",
};

const SUGGESTIONS = [
  "anxiety",
  "pickleball",
  "dgroup",
  "marriage",
  "parking",
  "NXTGEN",
  "volunteer",
  "prayer",
];

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  const hits = q ? await globalSearch(q) : [];

  // Group by kind so a mixed result set stays readable.
  const byKind = new Map<string, typeof hits>();
  for (const h of hits) {
    byKind.set(h.kind, [...(byKind.get(h.kind) ?? []), h]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title="Find anything."
        lead="Messages, events, Dgroups, communities, facilities, classes, and answers to practical questions."
      />

      <Section>
        <Container>
          <form action="/search" className="flex gap-2">
            <label className="sr-only" htmlFor="q">
              Search CCF Centris
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              autoFocus
              placeholder="Try a topic, a passage, a room, or a question"
              className="w-full border border-hairline bg-paper-bright px-5 py-4 text-[1.05rem] focus:border-ink"
            />
            <button
              type="submit"
              className="btn-press label shrink-0 border border-ink bg-ink px-6 text-paper-bright transition-colors hover:bg-night"
            >
              Search
            </button>
          </form>

          {!q ? (
            <div className="mt-8">
              <p className="label text-ink-mute">Try one of these</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Link
                    key={s}
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="btn-press label border border-ink/25 px-3.5 py-2 text-ink transition-colors hover:border-ink"
                  >
                    {s}
                  </Link>
                ))}
              </div>

              <p className="mt-12 max-w-2xl leading-relaxed text-ink-mute">
                Search currently covers titles, descriptions, topics, and
                passages. Once sermon transcripts are uploaded, it will also
                search inside the messages themselves and point to the moment a
                subject was discussed.
              </p>
            </div>
          ) : hits.length ? (
            <>
              <p className="mt-8 border-t border-hairline pt-5 text-[0.9rem] text-ink-mute">
                <span className="tabular">{hits.length}</span>{" "}
                {hits.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
              </p>

              <div className="mt-8 space-y-12">
                {[...byKind.entries()].map(([kind, list]) => (
                  <div key={kind}>
                    <h2 className="font-display text-2xl">
                      {kind}
                      <span className="ml-3 text-lg text-ink-mute">
                        {list.length}
                      </span>
                    </h2>
                    <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
                      {list.map((h, i) => (
                        <li key={`${h.href}-${i}`}>
                          <Link
                            href={h.href}
                            className="group flex flex-col gap-1 py-5"
                          >
                            <span className="flex flex-wrap items-center gap-3">
                              <span className="font-display text-xl leading-snug group-hover:text-clay">
                                {h.title}
                              </span>
                              <Pill tone="muted">{h.kind}</Pill>
                            </span>
                            {h.excerpt ? (
                              <span className="max-w-3xl text-[0.92rem] leading-relaxed text-ink-soft">
                                {h.excerpt}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-10">
              <EmptyState
                title={`Nothing matched "${q}".`}
                body="Try a broader word, or browse from one of the main sections. If you are looking for something practical about visiting, the FAQs probably cover it."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <ButtonLink href="/visit/faqs" tone="outline">
                      Read the FAQs
                    </ButtonLink>
                    <ButtonLink href="/contact">Ask us directly</ButtonLink>
                  </div>
                }
              />
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}

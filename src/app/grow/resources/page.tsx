import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, EmptyState, Pill, Section } from "@/components/ui";
import { findResources, getResourceFacets, getSyncMeta } from "@/lib/queries";
import { SyncedNote } from "@/components/synced-note";

/** Synced from ccf.org.ph/resources every content-sync run. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Resources",
  description:
    "CCF's growth materials — handouts, videos, and booklets that answer real questions about faith, life, and following Jesus.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filters = {
    q: one(sp.q),
    format: one(sp.format),
    language: one(sp.language),
  };
  const [resources, facets, sync] = await Promise.all([
    findResources(filters),
    getResourceFacets(),
    getSyncMeta("resources"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="CCF's growth materials, in one place."
        lead="Handouts, videos, and booklets that answer real questions about God, yourself, and following Jesus. Straight from ccf.org.ph."
      />

      <Section>
        <Container>
          {/* Filters — plain links, work without JS, state lives in the URL. */}
          <form method="get" className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="label text-ink-mute">Search</span>
              <input
                type="search"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="e.g. Jesus, prayer, decision"
                className="border border-hairline bg-paper-bright px-3 py-2 text-[0.95rem]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-mute">Format</span>
              <select
                name="format"
                defaultValue={filters.format ?? ""}
                className="border border-hairline bg-paper-bright px-3 py-2 text-[0.95rem]"
              >
                <option value="">All</option>
                {facets.formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-mute">Language</span>
              <select
                name="language"
                defaultValue={filters.language ?? ""}
                className="border border-hairline bg-paper-bright px-3 py-2 text-[0.95rem]"
              >
                <option value="">All</option>
                {facets.languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="label border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
            >
              Apply
            </button>
            {(filters.q || filters.format || filters.language) && (
              <Link href="/grow/resources" className="label py-2.5 text-ink-mute underline">
                Clear
              </Link>
            )}
          </form>

          <p className="mt-6 text-[0.85rem] text-ink-mute">
            {resources.length} {resources.length === 1 ? "resource" : "resources"}
          </p>

          {resources.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Nothing matches those filters"
                body="Try a broader search, or clear the filters to see everything."
                action={
                  <ButtonLink href="/grow/resources" tone="outline" size="sm">
                    Clear filters
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <ul className="mt-8 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <li key={r.slug} className="flex flex-col bg-paper-bright p-7">
                  <div className="flex flex-wrap gap-2">
                    {r.format ? <Pill tone="muted">{r.format}</Pill> : null}
                    {r.language ? <Pill tone="muted">{r.language}</Pill> : null}
                  </div>
                  <h2 className="font-display mt-3 text-xl leading-tight">{r.title}</h2>
                  {r.description ? (
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                      {r.description}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-5">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label inline-block border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                      >
                        {r.external ? "Open on ccf.org.ph ↗" : "Open"}
                      </a>
                    ) : (
                      <span className="label inline-block border border-dashed border-hairline px-4 py-2.5 text-ink-mute">
                        Not yet available
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <SyncedNote lastRunAt={sync.lastRunAt} source="ccf.org.ph/resources" />
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ["Weekly 4Ws", "The discussion guide tied to each Sunday message.", "/watch/4ws"],
              ["52-Week Scripture", "One memory verse a week, with the full text.", "/grow/resources/scripture-memory"],
              ["Chronicle", "The message digest, issue by issue.", "/grow/resources/chronicle"],
            ].map(([t, b, href]) => (
              <div key={t} className="border border-hairline bg-paper-bright p-6">
                <h3 className="font-display text-xl">{t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{b}</p>
                <ButtonLink href={href} tone="ghost" size="sm" className="mt-4 -ml-3.5">
                  Open →
                </ButtonLink>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

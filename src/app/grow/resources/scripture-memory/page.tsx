import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Container, EmptyState, Pill, Section } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { getScriptureMemory, getScriptureYears, getSyncMeta } from "@/lib/queries";
import { SyncedNote } from "@/components/synced-note";

/** Synced from ccf.org.ph/52-week-scripture every content-sync run. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "52-Week Scripture",
  description:
    "CCF's weekly memory verse — the reference, the full text, and the official download, one week at a time.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ScriptureMemoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const yearParam = Array.isArray(sp.year) ? sp.year[0] : sp.year;
  const [years, sync] = await Promise.all([
    getScriptureYears(),
    getSyncMeta("scriptureMemory"),
  ]);
  const year = yearParam && years.includes(Number(yearParam)) ? Number(yearParam) : undefined;
  const weeks = await getScriptureMemory(year);
  const current = !year ? weeks[0] : null;

  return (
    <>
      <PageHeader
        eyebrow="52-Week Scripture"
        title="One verse a week, worth carrying."
        lead="CCF's memory verse for every week of the year. Reference, full text, and the official card to download."
      />

      {current ? (
        <Section tone="deep">
          <Container>
            <p className="label text-ink-mute">This week</p>
            <div className="mt-4 border border-hairline bg-paper-bright p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone="clay">Week {current.week}</Pill>
                {current.dateLabel ? (
                  <span className="label text-ink-mute">
                    {current.date ? fmtDate(current.date) : current.dateLabel}
                  </span>
                ) : null}
              </div>
              <p className="font-display mt-4 text-3xl leading-tight">
                {current.reference}
              </p>
              {current.verseText ? (
                <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
                  {current.verseText}
                </p>
              ) : null}
              {current.downloadUrl ? (
                <a
                  href={current.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label mt-6 tap border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                >
                  Download the card ↗
                </a>
              ) : null}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container>
          <nav className="flex flex-wrap gap-2" aria-label="Filter by year">
            <Link
              href="/grow/resources/scripture-memory"
              className={`label border px-3 py-1.5 ${
                !year ? "border-ink bg-ink text-paper-bright" : "border-hairline text-ink-mute"
              }`}
            >
              All years
            </Link>
            {years.map((y) => (
              <Link
                key={y}
                href={`/grow/resources/scripture-memory?year=${y}`}
                className={`label border px-3 py-1.5 ${
                  year === y ? "border-ink bg-ink text-paper-bright" : "border-hairline text-ink-mute"
                }`}
              >
                {y}
              </Link>
            ))}
          </nav>

          {weeks.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No weeks yet"
                body="The verse archive will appear here after the next content sync."
              />
            </div>
          ) : (
            <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
              {weeks.map((w) => (
                <li
                  key={`${w.year}-${w.week}`}
                  className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-5"
                >
                  <p className="label w-40 shrink-0 text-ink-mute">
                    Week {w.week}
                    {" · "}
                    {w.date ? fmtDate(w.date) : w.dateLabel ?? w.year}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg leading-tight">{w.reference}</p>
                    {w.verseText ? (
                      <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">
                        {w.verseText}
                      </p>
                    ) : null}
                  </div>
                  {w.downloadUrl ? (
                    <a
                      href={w.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                    >
                      Download ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <SyncedNote
            lastRunAt={sync.lastRunAt}
            source="ccf.org.ph/52-week-scripture"
          />
        </Container>
      </Section>
    </>
  );
}

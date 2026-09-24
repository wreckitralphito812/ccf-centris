import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Pill, Section } from "@/components/ui";
import { getCurrentFourWs, getFourWsWeeks, getSyncMeta } from "@/lib/queries";
import { SyncedNote } from "@/components/synced-note";

/** Synced from ccf.org.ph/4ws every content-sync run. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "4Ws",
  description:
    "Weekly 4Ws discussion guides for CCF Dgroups: Welcome, Worship, Word, and Works, tied to each Sunday message.",
};

export default async function FourWsPage() {
  const [current, weeks, sync] = await Promise.all([
    getCurrentFourWs(),
    getFourWsWeeks(),
    getSyncMeta("fourWsWeeks"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="4Ws"
        title="The 4Ws guide for your Dgroup."
        lead="Welcome, Worship, Word, Works: CCF's weekly Dgroup guide, based on that Sunday's message."
        actions={
          <>
            <ButtonLink href="/grow/find-a-dgroup" size="lg">
              Find a Dgroup
            </ButtonLink>
            <ButtonLink href="/grow/join-a-dgroup" tone="outline" size="lg">
              How Dgroups work
            </ButtonLink>
          </>
        }
      />

      {current ? (
        <Section tone="deep" className="py-12">
          <Container>
            <p className="label text-ink-mute">This week</p>
            <div className="mt-4 border border-hairline bg-paper-bright p-8">
              <div className="flex flex-wrap items-center gap-3">
                {current.weekNumber ? (
                  <Pill tone="clay">Week {current.weekNumber}</Pill>
                ) : null}
                {current.dateSpan ? (
                  <span className="label text-ink-mute">{current.dateSpan}</span>
                ) : null}
                {current.seriesTitle ? (
                  <span className="label text-ink-mute">· {current.seriesTitle}</span>
                ) : null}
              </div>
              <h2 className="font-display mt-4 text-3xl leading-tight">
                {current.title}
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {current.hasGuide ? (
                  <ButtonLink href={`/watch/4ws/${current.slug}`}>
                    Open the guide
                  </ButtonLink>
                ) : (
                  <a
                    href={current.goViralUrl ?? current.standardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                  >
                    Open on ccf.org.ph ↗
                  </a>
                )}
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container>
          <Eyebrow>Every week</Eyebrow>
          <h2 className="display-md mt-4">Previous 4Ws</h2>

          <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
            {weeks.map((w) => (
              <li
                key={w.slug}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 py-5"
              >
                <p className="label w-44 shrink-0 text-ink-mute">
                  {w.weekNumber ? `Week ${w.weekNumber} · ` : ""}
                  {w.dateSpan ?? ""}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-tight">{w.title}</p>
                  {w.seriesTitle ? (
                    <p className="mt-0.5 text-[0.85rem] text-ink-mute">
                      {w.seriesTitle}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {w.hasGuide ? (
                    <Link
                      href={`/watch/4ws/${w.slug}`}
                      className="label border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                    >
                      Open
                    </Link>
                  ) : (
                    <a
                      href={w.standardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label border border-hairline px-3.5 py-2 text-ink-mute transition-colors hover:border-ink hover:text-ink"
                    >
                      ccf.org.ph ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <SyncedNote lastRunAt={sync.lastRunAt} source="ccf.org.ph/4ws" />
        </Container>
      </Section>
    </>
  );
}

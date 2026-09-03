import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, EmptyState, Pill, Section } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { getChronicleGroups, getSyncMeta } from "@/lib/queries";
import { SyncedNote } from "@/components/synced-note";

/** Synced from ccf.org.ph/chronicle every content-sync run. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Chronicle",
  description:
    "CCF's weekly message digest — every Chronicle issue, grouped by teaching series, with the official download.",
};

export default async function ChroniclePage() {
  const [groups, sync] = await Promise.all([
    getChronicleGroups(),
    getSyncMeta("chronicleIssues"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Chronicle"
        title="The message, week by week."
        lead="CCF's Chronicle digests each weekend message. Browse by series; every issue links to the official download on ccf.org.ph."
      />

      <Section>
        <Container>
          {groups.length === 0 ? (
            <EmptyState
              title="No issues yet"
              body="The Chronicle archive will appear here after the next content sync."
            />
          ) : (
            <div className="space-y-14">
              {groups.map((group) => (
                <div key={group.series}>
                  <h2 className="display-md">{group.series}</h2>
                  <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
                    {group.issues.map((issue) => (
                      <li
                        key={issue.downloadId}
                        className="flex flex-wrap items-center gap-x-6 gap-y-2 py-5"
                      >
                        <p className="label w-40 shrink-0 text-ink-mute">
                          {issue.serviceDate
                            ? fmtDate(issue.serviceDate)
                            : issue.serviceDateLabel ?? "—"}
                        </p>
                        <p className="min-w-0 flex-1 font-display text-lg leading-tight">
                          {issue.title}
                        </p>
                        {issue.displayedDownloadCount != null ? (
                          <Pill tone="muted">
                            {issue.displayedDownloadCount.toLocaleString()} downloads
                          </Pill>
                        ) : null}
                        <a
                          href={issue.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="label border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                        >
                          Download ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <SyncedNote lastRunAt={sync.lastRunAt} source="ccf.org.ph/chronicle" />
        </Container>
      </Section>
    </>
  );
}

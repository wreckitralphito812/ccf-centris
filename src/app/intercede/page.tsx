import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, EmptyState, Pill, Section } from "@/components/ui";
import { getCurrentIntercede, getSyncMeta } from "@/lib/queries";
import { SyncedNote } from "@/components/synced-note";

/** Synced from ccf.org.ph/intercede every content-sync run. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Intercede",
  description:
    "CCF's bi-annual Prayer & Fasting weeks — the current campaign dates, how to fast, and where to join in.",
};

function fmtRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const s = new Date(`${start}T00:00:00+08:00`).toLocaleDateString("en-PH", opts);
  if (!end || end === start) return s;
  const e = new Date(`${end}T00:00:00+08:00`).toLocaleDateString("en-PH", opts);
  return `${s} – ${e}`;
}

export default async function IntercedePage() {
  const [view, sync] = await Promise.all([
    getCurrentIntercede(),
    getSyncMeta("intercede"),
  ]);

  if (!view) {
    return (
      <>
        <PageHeader eyebrow="Intercede" title="Prayer & Fasting" />
        <Section>
          <Container>
            <EmptyState
              title="No campaign published yet"
              body="Intercede details will appear here after the next content sync."
            />
          </Container>
        </Section>
      </>
    );
  }

  const { campaign, archived } = view;
  const range = fmtRange(campaign.startDate, campaign.endDate);

  return (
    <>
      <PageHeader
        eyebrow="Intercede"
        title={campaign.campaignTitle}
        lead={
          range
            ? archived
              ? `Held ${range}. Kept here as a guide until the next season.`
              : `${range} — come expectant, come surrendered.`
            : undefined
        }
        actions={
          <>
            {campaign.biblePlanUrl ? (
              <ButtonLink href={campaign.biblePlanUrl} size="lg">
                Bible reading plan
              </ButtonLink>
            ) : null}
            {campaign.prayerRequestUrl ? (
              <ButtonLink href={campaign.prayerRequestUrl} tone="outline" size="lg">
                Submit a prayer request
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <Section>
        <Container>
          {archived ? (
            <div className="mb-8">
              <Pill tone="muted">Archived — most recent guide</Pill>
            </div>
          ) : null}

          {campaign.bodyHtml ? (
            <article
              className="prose-ccf max-w-2xl [&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-8 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
              // Sanitized at parse time against a narrow allowlist.
              dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }}
            />
          ) : (
            <EmptyState
              title="Guide coming soon"
              body="The full primer and fasting guidance will appear here after the next content sync."
            />
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            {campaign.videoUrl ? (
              <a
                href={campaign.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="label border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
              >
                Watch the promo ↗
              </a>
            ) : null}
            <a
              href={campaign.source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="label border border-hairline px-4 py-2.5 text-ink-mute transition-colors hover:border-ink hover:text-ink"
            >
              Full details on ccf.org.ph ↗
            </a>
          </div>
          <SyncedNote lastRunAt={sync.lastRunAt} source="ccf.org.ph/intercede" />
        </Container>
      </Section>
    </>
  );
}

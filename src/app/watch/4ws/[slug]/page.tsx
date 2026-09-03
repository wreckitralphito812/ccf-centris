import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Container, Pill, Section } from "@/components/ui";
import {
  getCurrentFourWs,
  getFourWsGuide,
  getFourWsWeeks,
} from "@/lib/queries";

/** Synced from the CCF 4Ws pages every content-sync run. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const weeks = await getFourWsWeeks();
  return weeks.filter((w) => w.hasGuide).map((w) => ({ slug: w.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getFourWsGuide(slug);
  return {
    title: guide ? `4Ws — ${guide.title}` : "4Ws guide",
    description: guide
      ? `The 4Ws discussion guide for "${guide.title}"${
          guide.dateLabel ? `, ${guide.dateLabel}` : ""
        }.`
      : undefined,
  };
}

const SECTIONS: {
  key: "worshipHtml" | "welcomeHtml" | "wordHtml" | "worksHtml" | "prayerPointsHtml";
  label: string;
}[] = [
  { key: "welcomeHtml", label: "Welcome" },
  { key: "worshipHtml", label: "Worship" },
  { key: "wordHtml", label: "Word" },
  { key: "worksHtml", label: "Works" },
  { key: "prayerPointsHtml", label: "Weekly Prayer Points" },
];

export default async function FourWsGuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const [guide, week] = await Promise.all([
    getFourWsGuide(slug),
    getCurrentFourWs().then(async (cur) =>
      cur?.slug === slug
        ? cur
        : (await getFourWsWeeks()).find((w) => w.slug === slug) ?? null,
    ),
  ]);

  if (!guide) notFound();

  return (
    <>
      <PageHeader
        eyebrow="4Ws"
        title={guide.title}
        lead={
          week?.seriesTitle
            ? `From the series "${week.seriesTitle}".`
            : undefined
        }
      />

      <Section>
        <Container>
          <div className="flex flex-wrap items-center gap-3">
            {week?.weekNumber ? <Pill tone="clay">Week {week.weekNumber}</Pill> : null}
            {week?.dateSpan ?? guide.dateLabel ? (
              <span className="label text-ink-mute">
                {week?.dateSpan ?? guide.dateLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-10 max-w-2xl space-y-12">
            {SECTIONS.map(({ key, label }) =>
              guide[key] ? (
                <section key={key}>
                  <h2 className="font-display text-2xl">{label}</h2>
                  <div
                    className="prose-ccf mt-4 [&_a]:underline [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
                    // Sanitized at parse time against a narrow allowlist.
                    dangerouslySetInnerHTML={{ __html: guide[key] as string }}
                  />
                </section>
              ) : null,
            )}

            {guide.memoryVerseReference ? (
              <section>
                <h2 className="font-display text-2xl">Memory verse</h2>
                <p className="mt-4 font-display text-xl">
                  {guide.memoryVerseReference}
                </p>
                {guide.memoryVerseText ? (
                  <p className="mt-2 leading-relaxed text-ink-soft">
                    {guide.memoryVerseText}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              href="/watch/4ws"
              className="label border border-hairline px-4 py-2.5 text-ink-mute transition-colors hover:border-ink hover:text-ink"
            >
              ← All 4Ws
            </Link>
            <a
              href={guide.source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="label border border-hairline px-4 py-2.5 text-ink-mute transition-colors hover:border-ink hover:text-ink"
            >
              View on ccf.org.ph ↗
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { MessageArt } from "@/components/cards";
import { findMessages, getSeries } from "@/lib/queries";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Series",
  description:
    "Teaching series at CCF Centris. Follow a series from the beginning, or pick up wherever you are.",
};

export default async function SeriesIndexPage() {
  const all = await getSeries();
  const counts = await Promise.all(
    all.map(async (s) => (await findMessages({ series: s.slug })).length),
  );

  return (
    <>
      <PageHeader
        eyebrow="Series"
        title="Teaching in sequence."
        lead="Most of our teaching runs in series of four to eight weeks, working through a book or a theme."
      />

      <Section>
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {all.map((s, i) => (
              <Link
                key={s.id}
                href={`/watch/series/${s.slug}`}
                className="group flex flex-col border border-hairline bg-paper-bright transition-colors hover:border-ink"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <MessageArt
                    seed={s.slug}
                    label={s.title}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-display text-2xl leading-tight transition-colors group-hover:text-clay">
                    {s.title}
                  </h2>
                  {s.subtitle ? (
                    <p className="mt-1 text-[0.9rem] italic text-ink-mute">
                      {s.subtitle}
                    </p>
                  ) : null}
                  {s.description ? (
                    <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                      {s.description}
                    </p>
                  ) : null}
                  <p className="label mt-auto pt-5 text-ink-mute">
                    {counts[i]} {counts[i] === 1 ? "message" : "messages"}
                    {s.starts_on ? ` · ${fmtDate(s.starts_on)}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

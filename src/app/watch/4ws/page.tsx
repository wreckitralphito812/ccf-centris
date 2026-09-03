import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui";
import { getFourWs, getMessages } from "@/lib/queries";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "4Ws",
  description:
    "Weekly 4Ws discussion guides for CCF Dgroups: Welcome, Worship, Word, and Works, tied to each Sunday message.",
};

export default async function FourWsPage() {
  const [guides, messages] = await Promise.all([getFourWs(), getMessages()]);
  const bySlug = new Map(messages.map((m) => [m.id, m]));

  return (
    <>
      <PageHeader
        eyebrow="4Ws"
        title="The guide your Dgroup opens each week."
        lead="Welcome, Worship, Word, Works. Four movements that shape how CCF groups meet, tied to the message from that Sunday."
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

      <Section tone="deep" className="py-12">
        <Container>
          <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Welcome", "An opening question that gets everyone talking before anything heavy."],
              ["Worship", "Reading the passage together, and prayer before discussion starts."],
              ["Word", "The questions that work through what the passage actually says."],
              ["Works", "One concrete step each person takes before the group meets again."],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-6">
                <p className="font-display text-3xl text-clay/30">{t}</p>
                <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Eyebrow>Every week</Eyebrow>
          <h2 className="display-md mt-4">Previous 4Ws</h2>

          <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
            {guides.map((w) => {
              const m = w.message_id ? bySlug.get(w.message_id) : null;
              return (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5"
                >
                  <p className="label w-32 shrink-0 text-ink-mute">
                    {fmtDate(w.week_of)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl leading-tight">
                      {m?.title ?? w.title}
                    </p>
                    <p className="mt-0.5 text-[0.85rem] text-ink-mute">
                      {m?.speaker?.name}
                      {m?.series ? ` · ${m.series.title}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {m ? (
                      <Link
                        href={`/watch/messages/${m.slug}#four-ws`}
                        className="label border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                      >
                        Open
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="label border border-hairline px-3.5 py-2 text-ink-mute transition-colors hover:border-ink hover:text-ink"
                    >
                      PDF
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>
    </>
  );
}

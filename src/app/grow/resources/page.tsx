import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Pill, Section } from "@/components/ui";
import { getResources } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Reading plans, Dgroup templates, devotions, and guides from CCF Centris that you can use this week.",
};

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Things you can actually use this week."
        lead="Guides, plans, and templates for your own growth and for the group you lead."
      />

      <Section>
        <Container>
          <ul className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <li key={r.id} className="flex flex-col bg-paper-bright p-7">
                {r.kind ? <Pill tone="muted">{r.kind}</Pill> : null}
                <h2 className="font-display mt-3 text-2xl leading-tight">
                  {r.title}
                </h2>
                {r.description ? (
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                    {r.description}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="label mt-auto self-start border border-ink px-4 py-2.5 pt-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                  style={{ marginTop: "1.5rem" }}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-2xl text-[0.85rem] leading-relaxed text-ink-mute">
            Files are uploaded and replaced by the communications team in the
            admin, so this list stays current without a code change.
          </p>
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ["Weekly 4Ws", "The discussion guide tied to each Sunday message.", "/watch/4ws"],
              ["Message archive", "Every message, searchable by topic and passage.", "/watch/messages"],
              ["GLC classes", "Go deeper than a Sunday or a guide can take you.", "/grow/glc"],
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

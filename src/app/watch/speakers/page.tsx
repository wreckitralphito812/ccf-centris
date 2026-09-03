import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { findMessages, getSpeakers } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Speakers",
  description: "The pastors and leaders who teach at CCF Centris.",
};

export default async function SpeakersPage() {
  const speakers = await getSpeakers();
  const counts = await Promise.all(
    speakers.map(async (s) => (await findMessages({ speaker: s.slug })).length),
  );

  return (
    <>
      <PageHeader
        eyebrow="Speakers"
        title="Who teaches at Centris."
        lead="Our own pastoral team, plus teachers from across CCF."
      />

      <Section>
        <Container>
          <ul className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {speakers.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={`/watch/speakers/${s.slug}`}
                  className="group flex h-full flex-col bg-paper-bright p-7 transition-colors hover:bg-bone"
                >
                  <span
                    aria-hidden
                    className="font-display flex h-16 w-16 items-center justify-center border border-hairline bg-paper text-2xl text-clay"
                  >
                    {s.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <h2 className="font-display mt-5 text-2xl leading-tight transition-colors group-hover:text-clay">
                    {s.name}
                  </h2>
                  {s.role_title ? (
                    <p className="label mt-1.5 text-ink-mute">{s.role_title}</p>
                  ) : null}
                  {s.bio ? (
                    <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                      {s.bio}
                    </p>
                  ) : null}
                  <p className="label mt-auto pt-5 text-clay">
                    {counts[i]} {counts[i] === 1 ? "message" : "messages"} →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}

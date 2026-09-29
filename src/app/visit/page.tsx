import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui";
import {
  MAPS_EMBED,
  MAPS_LINK,
  PARKING,
  PARKING_EMBED,
  SITE,
  WAZE_LINK,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Find CCF Centris on the second floor of Centris Station, Eton Centris, EDSA corner Quezon Avenue. How to get here by car or by train, and where to park.",
};

/**
 * The Visit page answers one question, where are you and how do I get there,
 * on one page: the pin, then both routes in side by side, each spelled out in
 * full. The routes used to be two buttons that sent people to a separate
 * directions page; CCF asked for fewer page hops, so the directions page now
 * redirects here.
 *
 * Two routes, on CCF's request. Grab/taxi folds into Car (same drop-off) and
 * walking folds into Train (same concourse route), each as a one-line note.
 */
const ROUTES = [
  {
    id: "car",
    label: "By car",
    steps: [
      "Enter Eton Centris from EDSA or Quezon Avenue.",
      `Park at ${PARKING.name}. Rates are set by the mall.`,
      "Walk to CCF Centris, second floor of Centris Station.",
    ],
    note: "Arriving by Grab or taxi? Use the same drop-off, then walk up.",
    media: { label: "Where to park" },
    facts: [
      ["Parking", PARKING.name],
      ["Rates", "Set by the mall"],
      ["Floor", "Second floor, Centris Station"],
    ],
  },
  {
    id: "train",
    label: "By train",
    steps: [
      "Take MRT-3 to Quezon Avenue station.",
      "Walk through the connecting concourse into Eton Centris.",
      "Walk to CCF Centris, second floor of Centris Station.",
    ],
    note: "Walking in from the street? Cross at EDSA and Quezon Avenue and follow the same route from there.",
    media: { label: "Quezon Avenue station" },
    facts: [
      ["Nearest station", "MRT-3 Quezon Avenue"],
      ["From the platform", "Connected by a walkway"],
      ["Floor", "Second floor, Centris Station"],
    ],
  },
] as const;

export default function VisitPage() {
  return (
    <>
      <PageHeader
        eyebrow="Visit"
        title="Come find us at Centris."
        lead="Second floor of Centris Station, inside Eton Centris, at the corner of EDSA and Quezon Avenue. You don't need to register, and there's no dress code."
        image={{
          src: "/photos/centris-station.jpg",
          alt: "Centris Station building at Eton Centris, with its sign above the entrance",
          position: "center 40%",
        }}
      />

      {/* The pin first. Everything else on this page is a way of acting on it. */}
      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-12">
            <div className="border border-hairline bg-paper-bright p-2">
              <iframe
                title={`Map showing ${SITE.name} at Eton Centris, EDSA corner Quezon Avenue, Quezon City`}
                src={MAPS_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[4/3] w-full lg:aspect-[5/4]"
              />
            </div>

            <div className="lg:pt-2">
              <Eyebrow>The pin</Eyebrow>
              <address className="font-display mt-5 text-2xl not-italic leading-snug sm:text-3xl">
                {SITE.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>

              <div className="mt-7 grid gap-2 sm:max-w-sm">
                <ButtonLink href={MAPS_LINK} target="_blank" rel="noreferrer" size="lg" full>
                  Get directions
                </ButtonLink>
                <ButtonLink
                  href={WAZE_LINK}
                  target="_blank"
                  rel="noreferrer"
                  tone="outline"
                  size="lg"
                  full
                >
                  Open in Waze
                </ButtonLink>
              </div>

            </div>
          </div>
        </Container>
      </Section>

      {/* Both routes, in full, side by side. */}
      <Section tone="deep" id="getting-here" className="scroll-mt-24">
        <Container>
          <Eyebrow>Getting here</Eyebrow>
          <h2 className="display-md mt-4 text-balance">By car or by train.</h2>
          {/* One grid for both routes, with each card on a subgrid, so the
              heading, steps, note, picture and facts sit on the same line in
              both columns even when one note wraps and the other doesn't. */}
          <div className="mt-8 grid gap-px border border-hairline bg-hairline md:grid-cols-2 md:grid-rows-[repeat(5,auto)]">
            {ROUTES.map((r) => (
              <div
                key={r.id}
                id={r.id}
                className="flex scroll-mt-28 flex-col gap-6 bg-paper-bright p-7 sm:p-9 md:row-span-5 md:grid md:grid-rows-subgrid md:gap-y-6"
              >
                <h3 className="font-display text-2xl leading-tight text-ink">{r.label}</h3>
                <ol className="space-y-3">
                  {r.steps.map((s, i) => (
                    <li key={s} className="grid grid-cols-[2rem_1fr] text-[0.95rem] leading-relaxed">
                      <span className="label pt-0.5 text-clay tabular">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-ink-soft">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="self-start border-l-2 border-clay pl-4 text-[0.88rem] leading-relaxed text-ink-mute">
                  {r.note}
                </p>
                <figure>
                  <figcaption className="label text-clay">{r.media.label}</figcaption>
                  <div className="relative mt-3 aspect-[4/3] overflow-hidden border border-hairline bg-paper">
                    {r.id === "car" ? (
                      <iframe
                        title={`Map showing ${PARKING.name}`}
                        src={PARKING_EMBED}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0 h-full w-full"
                      />
                    ) : (
                      <Image
                        src="/photos/mrt-quezon-avenue.jpg"
                        alt="Inside MRT-3 Quezon Avenue station, under the Quezon Avenue sign"
                        fill
                        sizes="(min-width: 768px) 40vw, 100vw"
                        className="object-cover"
                        style={{ objectPosition: "center 35%" }}
                      />
                    )}
                  </div>
                </figure>
                <dl className="divide-y divide-hairline border-y border-hairline">
                  {r.facts.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3">
                      <dt className="label text-ink-mute">{k}</dt>
                      <dd className="text-right text-[0.95rem] text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-[0.85rem] leading-relaxed text-ink-mute">
            Mall parking rates and entrances can change. The Welcome Center can always point you
            the right way.
          </p>
        </Container>
      </Section>
    </>
  );
}

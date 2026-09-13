import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui";
import { MAPS_EMBED, MAPS_LINK, MAPS_PLACE, PARKING, SITE, WAZE_LINK } from "@/lib/site";

export const metadata: Metadata = {
  title: "Directions",
  description:
    "How to reach CCF Centris on the 2nd floor of Centris Station, Eton Centris, EDSA corner Quezon Avenue: by car or by train.",
};

/**
 * Two ways in, on CCF's request — down from four. Grab/taxi folds into Car
 * (same drop-off, same walk up) and Walking folds into Train (same
 * concourse route, minus the ride) as a one-line note rather than being
 * dropped outright, so nobody loses their instructions.
 *
 * Each route ends the same way: "walk to CCF Centris." Past versions spelled
 * out "take the lifts or escalators, then follow signage" as two separate
 * steps once you're already inside the building — CCF asked for that
 * collapsed into the one plain instruction it actually is.
 */
const ROUTES = [
  {
    id: "car",
    label: "By car",
    steps: [
      "Enter Eton Centris from EDSA or Quezon Avenue.",
      `Park at ${PARKING.name}. Rates are set by the mall.`,
      "Walk to CCF Centris, second floor.",
    ],
    note: "Arriving by Grab or taxi? Use the same drop-off, then walk up.",
    link: { label: "Open the parking pin in Google Maps", href: PARKING.mapsUrl },
  },
  {
    id: "train",
    label: "By train",
    steps: [
      "Take MRT-3 to Quezon Avenue station.",
      "Walk through the connecting concourse into Eton Centris.",
      "Walk to CCF Centris, second floor.",
    ],
    note: "Walking in from the street? Cross at EDSA and Quezon Avenue and follow the same route from there.",
  },
];

export default function DirectionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Directions"
        title="Two ways to get here."
        lead="Second floor of Centris Station, inside Eton Centris — by car or by train."
        actions={
          <>
            <ButtonLink href={MAPS_LINK} target="_blank" rel="noreferrer" size="lg">
              Get directions
            </ButtonLink>
            <ButtonLink
              href={WAZE_LINK}
              target="_blank"
              rel="noreferrer"
              tone="outline"
              size="lg"
            >
              Open in Waze
            </ButtonLink>
          </>
        }
      />

      {/* Address and map */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <Eyebrow>The address</Eyebrow>
              <address className="font-display mt-5 text-3xl not-italic leading-snug sm:text-4xl">
                {SITE.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
              <dl className="mt-8 divide-y divide-hairline border-y border-hairline">
                {[
                  ["Floor", "Second floor, Centris Station"],
                  ["Nearest station", "MRT-3 Quezon Avenue, connected"],
                  ["Parking", "On site at Eton Centris"],
                  ["Entrance", "Main concourse entrance, then 2/F"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3.5">
                    <dt className="label text-ink-mute">{k}</dt>
                    <dd className="text-right text-[0.95rem]">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[0.85rem] leading-relaxed text-ink-mute">
                Mall parking rates and the closest entrance can change. Our team
                keeps this page current, and the Welcome Center can always point
                you the right way.
              </p>
            </div>

            <div>
              <div className="border border-hairline bg-paper-bright p-2">
                <iframe
                  title="Map showing CCF Centris at Eton Centris, EDSA corner Quezon Avenue, Quezon City"
                  src={MAPS_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-square w-full"
                />
              </div>
              <a
                href={MAPS_PLACE}
                target="_blank"
                rel="noreferrer"
                className="link label tap mt-2 text-clay underline underline-offset-4"
              >
                Open the pin in Google Maps &#8599;
              </a>
            </div>
          </div>
        </Container>
      </Section>

      {/* Routes — two buttons, not four write-ups */}
      <Section tone="deep">
        <Container>
          <Eyebrow>Getting here</Eyebrow>
          <h2 className="display-md mt-4 text-balance">Pick one.</h2>
          <div className="mt-8 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {ROUTES.map((r) => (
              <div
                key={r.id}
                id={r.id}
                className="scroll-mt-28 bg-paper-bright p-7 sm:p-9"
              >
                <span className="label inline-flex border border-ink bg-ink px-4 py-2 text-paper-bright">
                  {r.label}
                </span>
                <ol className="mt-6 space-y-3">
                  {r.steps.map((s, i) => (
                    <li key={s} className="flex gap-3 text-[0.9rem] leading-relaxed">
                      <span className="label shrink-0 text-clay">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-ink-soft">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 border-l-2 border-clay pl-4 text-[0.85rem] leading-relaxed text-ink-mute">
                  {r.note}
                </p>
                {r.link ? (
                  <a
                    href={r.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="label tap mt-4 gap-1.5 text-clay underline underline-offset-4 hover:text-clay-deep"
                  >
                    {r.link.label} &#8599;
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

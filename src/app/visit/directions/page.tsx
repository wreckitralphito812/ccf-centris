import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section, SectionHead } from "@/components/ui";
import { MAPS_EMBED, MAPS_LINK, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Directions",
  description:
    "How to reach CCF Centris on the 2nd floor of Centris Station, Eton Centris, EDSA corner Quezon Avenue: MRT, driving, parking, drop-off, and PWD access.",
};

const ROUTES = [
  {
    id: "mrt",
    label: "By MRT",
    lead: "The simplest way in. Centris Station connects straight to the mall.",
    steps: [
      "Take MRT-3 to Quezon Avenue station.",
      "Follow signs for Centris Station and walk through the connecting concourse.",
      "Enter Eton Centris and take the escalator or lift to the second floor.",
      "CCF Centris is signposted from the second-floor concourse. The Welcome Center is just inside the entrance.",
    ],
  },
  {
    id: "car",
    label: "Driving",
    lead: "Parking is on site at Eton Centris.",
    steps: [
      "Enter Eton Centris from EDSA or from Quezon Avenue.",
      "Park in the mall car park. Rates are set by the mall and posted at entry.",
      "Take the lifts or escalators to the second floor.",
      "Follow signage for CCF Centris.",
    ],
    note: "Parking fills quickly on Sunday mornings. Arriving 20 minutes before the 10:00 AM service gives you time to find a slot.",
  },
  {
    id: "grab",
    label: "Grab or taxi",
    lead: "Set your destination to Eton Centris.",
    steps: [
      "Drop-off point: Eton Centris, EDSA corner Quezon Avenue, Quezon City.",
      "Use the covered drop-off nearest the concourse entrance.",
      "Head to the second floor and follow signage for CCF Centris.",
    ],
  },
  {
    id: "walk",
    label: "Walking",
    lead: "From the Quezon Avenue and EDSA intersection.",
    steps: [
      "Use the footbridge or pedestrian crossing to reach the Eton Centris side.",
      "Enter through the main concourse entrance.",
      "Take the escalator or lift to the second floor.",
    ],
  },
];

export default function DirectionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Directions"
        title="Right off the MRT at Quezon Avenue."
        lead="CCF Centris is on the second floor of Centris Station, inside Eton Centris, at the corner of EDSA and Quezon Avenue."
        actions={
          <>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noreferrer"
              className="label inline-flex items-center border border-clay bg-clay px-7 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep"
            >
              Open in maps
            </a>
            <ButtonLink href="/visit/service-times" tone="outline" size="lg">
              Service times
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

            <div className="border border-hairline bg-paper-bright p-2">
              <iframe
                title="Map showing CCF Centris at Eton Centris, EDSA corner Quezon Avenue, Quezon City"
                src={MAPS_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-square w-full"
              />
            </div>
          </div>
        </Container>
      </Section>

      {/* Routes */}
      <Section tone="deep">
        <Container>
          <SectionHead eyebrow="Getting here" title="Pick your route" />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {ROUTES.map((r) => (
              <div key={r.id} className="bg-paper-bright p-7">
                <h3 className="font-display text-2xl">{r.label}</h3>
                <p className="mt-2 text-[0.9rem] text-ink-soft">{r.lead}</p>
                <ol className="mt-5 space-y-3">
                  {r.steps.map((s, i) => (
                    <li key={s} className="flex gap-3 text-[0.9rem] leading-relaxed">
                      <span className="label shrink-0 text-clay">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-ink-soft">{s}</span>
                    </li>
                  ))}
                </ol>
                {r.note ? (
                  <p className="mt-5 border-l-2 border-clay pl-4 text-[0.85rem] leading-relaxed text-ink-mute">
                    {r.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Accessibility */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Eyebrow>Accessibility</Eyebrow>
              <h2 className="display-md mt-5">Getting in without stairs.</h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                If something here does not cover what you need, get in touch
                ahead of time and someone will meet you at the drop-off.
              </p>
              <ButtonLink href="/contact" className="mt-7">
                Tell us what you need
              </ButtonLink>
            </div>
            <ul className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {[
                ["Step-free route", "From the Centris Station concourse to the second floor, with lift access throughout."],
                ["PWD drop-off", "Use the covered drop-off closest to the concourse entrance."],
                ["Accessible seating", "Wheelchair spaces with companion seats at the rear and side bays of the worship hall."],
                ["Washrooms", "Accessible washrooms on the same floor as the worship hall."],
                ["Assisted listening", "Available at the Welcome Center before each service."],
                ["Service animals", "Welcome throughout the center."],
              ].map(([t, b]) => (
                <li key={t} className="bg-paper-bright p-6">
                  <h3 className="font-display text-lg">{t}</h3>
                  <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
                    {b}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui";
import { MAPS_EMBED, MAPS_LINK, MAPS_PLACE, SITE, WAZE_LINK } from "@/lib/site";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Find CCF Centris on the second floor of Centris Station, Eton Centris, EDSA corner Quezon Avenue. Open the map pin, get directions, or pick your route in.",
};

/**
 * The Visit page answers one question — where are you and how do I get there —
 * and answers it in that order: the pin, then directions, then the route in.
 *
 * It used to open with a grid of cards pointing at New here, Getting here, and
 * Common questions, which restated the Visit menu directly under the Visit
 * menu. Those pages are unchanged and still sit in the nav; this page no longer
 * duplicates them.
 */

/**
 * Two ways in, each jumping to its own card on the directions page. On CCF's
 * request: down from four routes (MRT, driving, Grab, walking) to the two
 * that matter most — Grab/taxi and walking fold into whichever of these is
 * closest to how they actually arrive.
 */
const ROUTES = [
  { id: "car", label: "By car", detail: "Parking on site at Eton Centris" },
  { id: "train", label: "By train", detail: "MRT-3 Quezon Avenue, connected" },
];

export default function VisitPage() {
  return (
    <>
      <PageHeader
        eyebrow="Visit"
        title={
          <>
            Come find us at{" "}
            <span className="italic text-clay">Centris.</span>
          </>
        }
        lead="Second floor of Centris Station, inside Eton Centris, at the corner of EDSA and Quezon Avenue. No registration, no dress code, and nobody will ask you to stand up."
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
                <ButtonLink
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  size="lg"
                  full
                >
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

              <a
                href={MAPS_PLACE}
                target="_blank"
                rel="noreferrer"
                className="link label tap mt-3 text-clay underline underline-offset-4"
              >
                Open the pin in Google Maps &#8599;
              </a>
            </div>
          </div>
        </Container>
      </Section>

      {/* Then the route in, once they know where they are heading. */}
      <Section tone="deep">
        <Container>
          <Eyebrow>Getting here</Eyebrow>
          <h2 className="display-md mt-4 text-balance">Two ways to get here.</h2>
          <div className="mt-8 grid max-w-2xl gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {ROUTES.map((r) => (
              <Link
                key={r.id}
                href={`/visit/directions#${r.id}`}
                className="group flex min-h-32 flex-col justify-between bg-paper-bright p-7 transition-colors hover:bg-bone"
              >
                <span className="font-display text-2xl leading-tight transition-colors group-hover:text-clay">
                  {r.label}
                </span>
                <span className="mt-3 block text-[0.85rem] leading-relaxed text-ink-soft">
                  {r.detail}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

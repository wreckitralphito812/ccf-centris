import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ButtonLink,
  Container,
  DetailRow,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { EventCard, MessageArt } from "@/components/cards";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getEvent, getEvents, getUpcomingEvents } from "@/lib/queries";
import {
  fmtDate,
  fmtDayLong,
  fmtPeso,
  fmtTime,
  fmtTimeRange,
} from "@/lib/format";
import { SITE, MAPS_LINK } from "@/lib/site";
import { RegisterForm } from "./register";

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return { title: "Event not found" };
  return {
    title: e.title,
    description: e.summary ?? undefined,
    openGraph: { title: `${e.title} — CCF Centris`, type: "website" },
  };
}

export default async function EventPage({
  params,
}: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();

  const full = e.capacity !== null && e.seats_taken >= e.capacity;
  const left = e.capacity === null ? null : e.capacity - e.seats_taken;

  const others = (await getUpcomingEvents())
    .filter((o) => o.slug !== e.slug)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.summary ?? "",
    startDate: e.starts_at,
    endDate: e.ends_at ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.location_note ?? "CCF Centris",
      address: {
        "@type": "PostalAddress",
        streetAddress: SITE.addressLines.slice(0, 2).join(", "),
        addressLocality: "Quezon City",
        addressCountry: "PH",
      },
    },
    organizer: { "@type": "Organization", name: e.organizer ?? "CCF Centris" },
    offers: {
      "@type": "Offer",
      price: (e.price_cents / 100).toFixed(2),
      priceCurrency: e.currency,
      availability: full
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
    },
  };

  const calendar = (() => {
    const f = (v: string) => v.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: `${e.title} — CCF Centris`,
      dates: `${f(e.starts_at)}/${f(e.ends_at ?? e.starts_at)}`,
      location: SITE.addressLines.join(", "),
      details: e.summary ?? "",
    });
    return `https://calendar.google.com/calendar/render?${p}`;
  })();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="border-b border-hairline bg-paper-deep">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs
            className="mb-8"
            items={[
              { label: "Events", href: "/events" },
              { label: e.title },
            ]}
          />

          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {e.category ? <Pill tone="clay">{e.category}</Pill> : null}
                {full ? (
                  <Pill tone="muted">Full</Pill>
                ) : left !== null ? (
                  <Pill tone="moss">{left} places left</Pill>
                ) : null}
                {e.price_cents === 0 ? <Pill tone="muted">Free</Pill> : null}
              </div>

              <h1 className="display-lg mt-5">{e.title}</h1>

              {e.summary ? (
                <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
                  {e.summary}
                </p>
              ) : null}

              <dl className="mt-8 grid max-w-lg gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  ["When", `${fmtDayLong(e.starts_at)}, ${fmtTimeRange(e.starts_at, e.ends_at)}`],
                  ["Where", e.location_note ?? "CCF Centris"],
                  ["Cost", fmtPeso(e.price_cents)],
                  ["Organised by", e.organizer ?? "CCF Centris"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="label text-ink-mute">{k}</dt>
                    <dd className="mt-0.5 text-[0.95rem]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="aspect-[4/3] overflow-hidden border border-hairline">
              <MessageArt
                seed={e.slug}
                label={e.category ?? "Event"}
                className="h-full w-full"
              />
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:items-start">
            <div>
              {e.description ? (
                <>
                  <h2 className="display-md">About this event</h2>
                  <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft">
                    {e.description}
                  </p>
                </>
              ) : null}

              {e.requirements ? (
                <div className="mt-8 border-l-2 border-clay bg-paper-bright py-4 pl-5 pr-4">
                  <p className="label text-clay">Before you come</p>
                  <p className="mt-1.5 leading-relaxed text-ink-soft">
                    {e.requirements}
                  </p>
                </div>
              ) : null}

              <dl className="mt-10">
                <DetailRow label="Date">{fmtDate(e.starts_at)}</DetailRow>
                <DetailRow label="Time">
                  {fmtTimeRange(e.starts_at, e.ends_at)}
                </DetailRow>
                <DetailRow label="Location">
                  {e.location_note ?? "CCF Centris"}
                </DetailRow>
                <DetailRow label="Cost">{fmtPeso(e.price_cents)}</DetailRow>
                {e.capacity !== null ? (
                  <DetailRow label="Capacity">
                    {e.seats_taken} of {e.capacity} taken
                  </DetailRow>
                ) : null}
                <DetailRow label="Registration">
                  {e.requires_registration ? "Required" : "Not needed"}
                </DetailRow>
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={calendar}
                  target="_blank"
                  rel="noreferrer"
                  className="label tap border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                >
                  Add to calendar
                </a>
                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="label tap border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                >
                  Directions
                </a>
              </div>

              <div className="mt-10 border border-hairline bg-paper-bright p-6">
                <p className="label text-ink-mute">Getting to Centris</p>
                <address className="font-display mt-3 text-xl not-italic leading-snug">
                  {SITE.addressLines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </address>
                <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-soft">
                  MRT-3 Quezon Avenue connects directly to the Centris Station
                  concourse. Parking is on site at Eton Centris.
                </p>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28">
              <RegisterForm
                eventTitle={e.title}
                priceCents={e.price_cents}
                full={full}
                requiresRegistration={e.requires_registration}
              />
            </aside>
          </div>
        </Container>
      </Section>

      {others.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead
              eyebrow="Also coming up"
              title="More at Centris"
              action={
                <ButtonLink href="/events" tone="outline">
                  All events
                </ButtonLink>
              }
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <EventCard key={o.id} e={o} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

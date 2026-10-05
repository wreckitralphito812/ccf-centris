import { ButtonLink, Container, Section, SectionHead } from "@/components/ui";
import { EventCard, MessageArt } from "@/components/cards";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddToCalendar, IconLine } from "@/components/booking";
import { ShareButton } from "./share-button";
import { fmtPeso } from "@/lib/format";
import { manilaDay, manilaMinutesOf } from "@/lib/admin-day";
import { nightLabel } from "@/lib/dgroup-tables";
import { timeLabel } from "@/lib/ministry-rooms";
import { SITE, MAPS_LINK } from "@/lib/site";
import type { CcfEvent } from "@/lib/types";

const hhmm = (iso: string) => {
  const m = manilaMinutesOf(iso);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const datesOf = (e: CcfEvent) => e.dates ?? [{ starts_at: e.starts_at, ends_at: e.ends_at }];

/**
 * One event (2026-10-05): the ministry's own artwork, then the facts typed in
 * the announcement form, so people can tap to register, add it to their
 * calendar and share it, which a picture alone can't do.
 */
export function EventDetail({ e, others }: { e: CcfEvent; others: CcfEvent[] }) {
  const now = new Date().toISOString();
  const dates = datesOf(e);
  const next = dates.find((d) => (d.ends_at ?? d.starts_at) >= now) ?? dates[dates.length - 1];
  const wide = e.artwork?.main_tv ?? e.cover_image_url;
  const tall = e.artwork?.social;
  const fee = e.fee_note ?? (e.price_cents ? fmtPeso(e.price_cents) : "Free");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.summary ?? "",
    startDate: next.starts_at,
    endDate: next.ends_at ?? undefined,
    image: wide ?? undefined,
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
    organizer: { "@type": "Organization", name: e.ministry ?? e.organizer ?? "CCF Centris" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section tone="mist" className="pt-8! sm:pt-12!">
        <Container className="max-w-6xl">
          <Breadcrumbs className="mb-6" items={[{ label: "What's Happening", href: "/events" }, { label: e.title }]} />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="overflow-hidden rounded-2xl bg-paper-bright shadow-[0_0_0_1px_var(--hairline),0_30px_50px_-20px_rgb(13_43_58/0.25)]">
              {wide ? (
                <picture>
                  {tall ? <source media="(max-width: 639px)" srcSet={tall} /> : null}
                  {/* Uploaded artwork; its store's host isn't in next/image's list. */}
                  <img src={wide} alt={`${e.title} poster`} className="block h-auto w-full" />
                </picture>
              ) : (
                <MessageArt seed={e.slug} label={e.category ?? "Event"} className="aspect-video w-full" />
              )}
            </div>

            <div className="calm-card p-7 sm:p-8 lg:sticky lg:top-24">
              <p className="text-[0.9rem] font-semibold text-clay">
                {[e.category, e.ministry].filter(Boolean).join(" · ") || "Event"}
              </p>
              <h1 className="mt-2 text-[1.9rem] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[2.2rem]">{e.title}</h1>
              {e.summary ? <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-soft">{e.summary}</p> : null}

              <div className="mt-6 space-y-3">
                {dates.map((d) => (
                  <IconLine key={d.starts_at} icon="calendar">
                    <span className={(d.ends_at ?? d.starts_at) < now ? "text-ink-mute line-through" : undefined}>
                      {nightLabel(manilaDay(d.starts_at))}, {timeLabel(manilaMinutesOf(d.starts_at))}
                      {d.ends_at ? ` – ${timeLabel(manilaMinutesOf(d.ends_at))}` : ""}
                    </span>
                  </IconLine>
                ))}
                <IconLine icon="pin">{e.location_note ?? "CCF Centris"}</IconLine>
                <IconLine icon="people">{fee}</IconLine>
              </div>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {e.registration_url ? (
                  <a
                    href={e.registration_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-press inline-flex min-h-12 items-center rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright hover:bg-clay-deep"
                  >
                    Register
                  </a>
                ) : (
                  <p className="w-full text-[0.95rem] text-ink-mute">No sign-up needed. Just come.</p>
                )}
                <ShareButton title={e.title} />
                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-press inline-flex min-h-12 items-center rounded-lg border border-edge bg-paper-bright px-5 text-[0.98rem] font-semibold text-ink hover:border-clay hover:text-clay"
                >
                  Directions
                </a>
              </div>

              <div className="mt-6 border-t border-rule pt-6">
                <AddToCalendar
                  event={{
                    uid: `event-${e.id}-${next.starts_at}`,
                    title: e.title,
                    date: manilaDay(next.starts_at),
                    start: hhmm(next.starts_at),
                    end: hhmm(next.ends_at ?? next.starts_at),
                    details: [e.summary, `${SITE.url}/events/${e.slug}`].filter(Boolean).join("\n\n"),
                    location: e.location_note ? `${e.location_note}, ${SITE.name}` : undefined,
                  }}
                />
                {dates.length > 1 ? <p className="mt-2 text-[0.85rem] text-ink-mute">Adds the next date. Each date is listed above.</p> : null}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {others.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow="Also coming up"
              title="More at Centris"
              action={
                <ButtonLink href="/events" tone="outline">
                  What&rsquo;s Happening
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

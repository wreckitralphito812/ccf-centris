import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ButtonLink,
  Container,
  DetailRow,
  Pill,
  Section,
  SectionHead,
} from "@/components/ui";
import { FacilityCard, MessageArt } from "@/components/cards";
import { getFacilities, getFacility } from "@/lib/queries";
import { fmtPeso } from "@/lib/format";

export async function generateStaticParams() {
  return (await getFacilities()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/centris/facilities/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFacility(slug);
  if (!f) return { title: "Facility not found" };
  return { title: f.name, description: f.description ?? undefined };
}

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const s = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${s}`;
}

export default async function FacilityPage({
  params,
}: PageProps<"/centris/facilities/[slug]">) {
  const { slug } = await params;
  const f = await getFacility(slug);
  if (!f) notFound();

  const others = (await getFacilities())
    .filter((o) => o.slug !== f.slug && o.kind === f.kind)
    .slice(0, 3);

  return (
    <>
      <section className="border-b border-hairline bg-paper-deep">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-8">
            <Link
              href="/centris/facilities"
              className="label text-ink-mute transition-colors hover:text-clay"
            >
              ← All facilities
            </Link>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                {f.is_reservable ? (
                  <Pill tone="sky">Reservable</Pill>
                ) : (
                  <Pill tone="muted">Not for general booking</Pill>
                )}
                {f.requires_approval && f.is_reservable ? (
                  <Pill tone="muted">Needs approval</Pill>
                ) : null}
                {f.capacity ? (
                  <Pill tone="clay">Capacity {f.capacity.toLocaleString()}</Pill>
                ) : null}
              </div>

              <h1 className="display-lg mt-5">{f.name}</h1>

              {f.description ? (
                <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
                  {f.description}
                </p>
              ) : null}

              {f.is_reservable ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href={`/centris/reserve?facility=${f.slug}`} size="lg">
                    Reserve this space
                  </ButtonLink>
                  {f.courts.length ? (
                    <ButtonLink href="/centris/availability" tone="outline" size="lg">
                      Check availability
                    </ButtonLink>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="aspect-[4/3] overflow-hidden border border-hairline">
              <MessageArt seed={f.slug} label={f.name} className="h-full w-full" />
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div>
              {f.amenities.length ? (
                <>
                  <h2 className="display-md">What&rsquo;s in the room</h2>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {f.amenities.map((a) => (
                      <li
                        key={a}
                        className="flex gap-3 border-b border-hairline pb-3 text-[0.95rem]"
                      >
                        <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-clay" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {f.layouts.length ? (
                <>
                  <h2 className="display-md mt-14">Layouts</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
                    Choose a layout when you book. Setup and teardown time must
                    be included in your booking window.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {f.layouts.map((l) => (
                      <Pill key={l}>{l}</Pill>
                    ))}
                  </div>
                </>
              ) : null}

              {f.courts.length ? (
                <>
                  <h2 className="display-md mt-14">Courts</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
                    The hall converts between sports. Courts are booked
                    individually, by the hour.
                  </p>
                  <ul className="mt-6 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
                    {f.courts.map((c) => (
                      <li key={c.id} className="bg-paper-bright p-5">
                        <p className="label text-clay">{c.sport}</p>
                        <p className="font-display mt-1 text-xl">{c.name}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {f.rules ? (
                <div className="mt-14 border-l-2 border-clay bg-paper-bright py-4 pl-5 pr-4">
                  <p className="label text-clay">House rules</p>
                  <p className="mt-1.5 leading-relaxed text-ink-soft">{f.rules}</p>
                </div>
              ) : null}

              {f.accessibility ? (
                <>
                  <h2 className="display-md mt-14">Accessibility</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
                    {f.accessibility}
                  </p>
                </>
              ) : null}

              <p className="mt-12 max-w-2xl text-[0.85rem] leading-relaxed text-ink-mute">
                Photography of this space will be published once the center has
                been photographed. Rates, hours, and rules are managed by the
                facilities team and can change.
              </p>
            </div>

            <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
              <p className="label text-clay">At a glance</p>
              <dl className="mt-4">
                {f.capacity ? (
                  <DetailRow label="Capacity">
                    {f.capacity.toLocaleString()}
                  </DetailRow>
                ) : null}
                <DetailRow label="Hours">
                  {to12h(f.open_time)} – {to12h(f.close_time)}
                </DetailRow>
                {f.hourly_rate_cents !== null ? (
                  <DetailRow label="Rate">
                    {f.hourly_rate_cents === 0
                      ? "No charge"
                      : `${fmtPeso(f.hourly_rate_cents)} per hour`}
                  </DetailRow>
                ) : null}
                <DetailRow label="Booking">
                  {f.is_reservable
                    ? f.requires_approval
                      ? "Request, then approval"
                      : "Instant"
                    : "Not available"}
                </DetailRow>
                {f.layouts.length ? (
                  <DetailRow label="Layouts">{f.layouts.length}</DetailRow>
                ) : null}
              </dl>

              {f.is_reservable ? (
                <ButtonLink
                  href={`/centris/reserve?facility=${f.slug}`}
                  full
                  className="mt-6"
                >
                  Reserve this space
                </ButtonLink>
              ) : (
                <p className="mt-6 text-[0.88rem] leading-relaxed text-ink-soft">
                  This space is held for CCF services and center operations. For
                  enquiries, contact the Centris team.
                </p>
              )}

              <ButtonLink
                href="/centris/reserve#policies"
                tone="ghost"
                size="sm"
                full
                className="mt-2"
              >
                Booking policies →
              </ButtonLink>
            </aside>
          </div>
        </Container>
      </Section>

      {others.length ? (
        <Section tone="deep">
          <Container>
            <SectionHead eyebrow="Similar" title="Other spaces like this" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <FacilityCard key={o.id} f={o} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getArchivedService, getSundayServices } from "@/lib/services";
import { fmtDayLong } from "@/lib/format";
import { YOUTUBE } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { archive } = await getSundayServices();
  return archive.map((s) => ({ id: s.videoId }));
}

export async function generateMetadata({
  params,
}: PageProps<"/watch/archive/[id]">): Promise<Metadata> {
  const { id } = await params;
  const service = await getArchivedService(id);
  if (!service) return { title: "Service not found" };
  return {
    title: service.title,
    description:
      service.description.slice(0, 160) ||
      `A past Sunday service from CCF, ${fmtDayLong(service.servedOn)}.`,
  };
}

export default async function ArchivedServicePage({
  params,
}: PageProps<"/watch/archive/[id]">) {
  const { id } = await params;
  const service = await getArchivedService(id);
  if (!service) notFound();

  return (
    <Section tone="ink" className="py-10 sm:py-14">
      <Container>
        <Breadcrumbs
          tone="dark"
          items={[
            { label: "Watch", href: "/watch" },
            { label: "Sunday Archive", href: "/watch/archive" },
            { label: service.title },
          ]}
        />

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="aspect-video w-full border border-white/15 bg-black">
              <iframe
                title={service.title}
                src={`${service.embedUrl}&autoplay=0`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <p className="mt-3 text-[0.8rem] text-paper-bright/45">
              A past service from CCF&rsquo;s official channel,{" "}
              <a
                href={YOUTUBE.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-paper-bright"
              >
                {YOUTUBE.handle}
              </a>
              .
            </p>
          </div>

          <div>
            <p className="label text-paper-bright/50">Sunday service</p>
            <h1 className="display-md mt-3">{service.title}</h1>
            <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {[
                [
                  "Service date",
                  service.servedOn ? fmtDayLong(service.servedOn) : "—",
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3">
                  <dt className="label text-paper-bright/50">{k}</dt>
                  <dd className="text-right text-[0.95rem] tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={service.watchUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-press label tap border border-paper-bright bg-paper-bright px-5 py-2.5 text-night transition-colors hover:bg-bone hover:border-bone"
              >
                Open on YouTube
              </a>
              <Link
                href="/watch/archive"
                className="btn-press label tap border border-white/25 px-5 py-2.5 text-paper-bright transition-colors hover:bg-white/10"
              >
                Back to the archive
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

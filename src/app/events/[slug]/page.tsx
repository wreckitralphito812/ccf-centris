import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "./detail";
import { getEvent, getEvents, getUpcomingEvents } from "@/lib/queries";

/** New announcements appear within a minute; approving one also revalidates. */
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return { title: "Event not found" };
  const image = e.artwork?.main_tv ?? e.cover_image_url ?? undefined;
  return {
    title: e.title,
    description: e.summary ?? undefined,
    openGraph: { title: `${e.title} | CCF Centris`, type: "website", ...(image ? { images: [image] } : {}) },
  };
}

/** One event: reads it, then hands it to EventDetail (detail.tsx). */
export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();
  const others = (await getUpcomingEvents()).filter((o) => o.slug !== e.slug).slice(0, 3);
  return <EventDetail e={e} others={others} />;
}

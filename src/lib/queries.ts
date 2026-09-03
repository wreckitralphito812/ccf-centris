import "server-only";

import { messages, series, speakers } from "@/data/teaching";
import { addons, communities, facilities } from "@/data/center";
import {
  announcements,
  dgroups,
  events,
  faqs,
  glcClasses,
  glcPrograms,
  resources,
  volunteerRoles,
} from "@/data/community";
import { buildServices } from "@/data/schedule";
import type {
  CcfEvent,
  Dgroup,
  Facility,
  Message,
  Reservation,
  Service,
  Slot,
} from "@/lib/types";

/**
 * The single seam between pages and storage.
 *
 * Every function here returns exactly the shape a Supabase query would, so
 * moving to the live database means rewriting this file and nothing else.
 * Pages never import from @/data directly.
 */

// --- Services ---------------------------------------------------------------

export async function getServices(): Promise<Service[]> {
  return buildServices();
}

export interface ServiceWindow {
  previous: Service | null;
  current: Service | null;
  next: Service | null;
}

/** The previous, currently running, and next service relative to now. */
export async function getServiceWindow(now = new Date()): Promise<ServiceWindow> {
  const all = await getServices();
  const t = now.getTime();

  const current =
    all.find(
      (s) =>
        new Date(s.starts_at).getTime() <= t && new Date(s.ends_at).getTime() > t,
    ) ?? null;

  const past = all.filter((s) => new Date(s.ends_at).getTime() <= t);
  const future = all.filter((s) => new Date(s.starts_at).getTime() > t);

  return {
    previous: past.length ? past[past.length - 1] : null,
    current,
    next: future.length ? future[0] : null,
  };
}

/** Services grouped by Manila calendar date, for the schedule page. */
export async function getUpcomingServices(limit = 8): Promise<Service[]> {
  const all = await getServices();
  const t = Date.now();
  return all.filter((s) => new Date(s.ends_at).getTime() > t).slice(0, limit);
}

// --- Messages ---------------------------------------------------------------

export async function getMessages(): Promise<Message[]> {
  return [...messages].sort((a, b) => b.preached_on.localeCompare(a.preached_on));
}

export async function getLatestMessage(): Promise<Message | null> {
  const all = await getMessages();
  return all[0] ?? null;
}

export async function getMessage(slug: string): Promise<Message | null> {
  return messages.find((m) => m.slug === slug) ?? null;
}

export interface MessageFilters {
  q?: string;
  series?: string;
  speaker?: string;
  topic?: string;
  book?: string;
  year?: string;
  sort?: "newest" | "oldest";
}

export async function findMessages(f: MessageFilters): Promise<Message[]> {
  let out = await getMessages();

  if (f.series) out = out.filter((m) => m.series?.slug === f.series);
  if (f.speaker) out = out.filter((m) => m.speaker?.slug === f.speaker);
  if (f.topic) out = out.filter((m) => m.topics.includes(f.topic!));
  if (f.book) out = out.filter((m) => m.bible_books.includes(f.book!));
  if (f.year) out = out.filter((m) => m.preached_on.startsWith(f.year!));

  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter((m) =>
      [
        m.title,
        m.description ?? "",
        m.scripture ?? "",
        m.speaker?.name ?? "",
        m.series?.title ?? "",
        ...m.topics,
        ...m.bible_books,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  if (f.sort === "oldest") out = [...out].reverse();
  return out;
}

/** Distinct filter values, derived rather than hardcoded. */
export async function getMessageFacets() {
  const all = await getMessages();
  const topics = [...new Set(all.flatMap((m) => m.topics))].sort();
  const books = [...new Set(all.flatMap((m) => m.bible_books))].sort();
  const years = [...new Set(all.map((m) => m.preached_on.slice(0, 4)))].sort().reverse();
  return { topics, books, years, series, speakers };
}

export async function getRelatedMessages(m: Message, limit = 3): Promise<Message[]> {
  const all = await getMessages();
  return all
    .filter((o) => o.id !== m.id)
    .map((o) => {
      const sameSeries = o.series?.slug === m.series?.slug ? 3 : 0;
      const shared = o.topics.filter((t) => m.topics.includes(t)).length;
      return { o, score: sameSeries + shared };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.o);
}

export async function getSeries() {
  return series;
}

export async function getSeriesBySlug(slug: string) {
  return series.find((s) => s.slug === slug) ?? null;
}

export async function getSpeakers() {
  return speakers;
}

export async function getSpeakerBySlug(slug: string) {
  return speakers.find((s) => s.slug === slug) ?? null;
}

export async function getFourWs() {
  const all = await getMessages();
  return all.map((m) => m.four_ws).filter((x): x is NonNullable<typeof x> => !!x);
}

// --- Communities and Dgroups ------------------------------------------------

export async function getCommunities() {
  return communities.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order);
}

export async function getCommunity(slug: string) {
  return communities.find((c) => c.slug === slug && c.is_active) ?? null;
}

export interface DgroupFilters {
  q?: string;
  audience?: string;
  mode?: string;
  day?: string;
  language?: string;
  community?: string;
}

export async function findDgroups(f: DgroupFilters): Promise<Dgroup[]> {
  let out = dgroups.filter((d) => d.is_open);

  if (f.audience) out = out.filter((d) => d.audience === f.audience);
  if (f.mode) out = out.filter((d) => d.mode === f.mode);
  if (f.language) out = out.filter((d) => d.language === f.language);
  if (f.community) out = out.filter((d) => d.community_slug === f.community);
  if (f.day && f.day !== "") {
    const day = Number(f.day);
    out = out.filter((d) => d.day_of_week === day);
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter((d) =>
      [d.name, d.description ?? "", d.general_area ?? ""].join(" ").toLowerCase().includes(q),
    );
  }
  return out;
}

export async function getDgroup(id: string) {
  return dgroups.find((d) => d.id === id) ?? null;
}

export async function getDgroupsForCommunity(slug: string) {
  return dgroups.filter((d) => d.community_slug === slug && d.is_open);
}

// --- Events -----------------------------------------------------------------

export async function getEvents(): Promise<CcfEvent[]> {
  return [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function getUpcomingEvents(limit?: number): Promise<CcfEvent[]> {
  const t = Date.now();
  const out = (await getEvents()).filter(
    (e) => new Date(e.ends_at ?? e.starts_at).getTime() > t,
  );
  return typeof limit === "number" ? out.slice(0, limit) : out;
}

export async function getEvent(slug: string) {
  return events.find((e) => e.slug === slug) ?? null;
}

export async function getEventsForCommunity(slug: string) {
  const t = Date.now();
  return events
    .filter((e) => e.community_slug === slug)
    .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() > t)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function getEventCategories() {
  return [...new Set(events.map((e) => e.category).filter(Boolean))].sort() as string[];
}

// --- GLC --------------------------------------------------------------------

export async function getGlcPrograms() {
  return glcPrograms;
}

export async function getGlcClasses() {
  return glcClasses;
}

// --- Serving ----------------------------------------------------------------

export async function getVolunteerRoles() {
  return volunteerRoles;
}

export async function getVolunteerRole(slug: string) {
  return volunteerRoles.find((r) => r.slug === slug) ?? null;
}

export async function getVolunteerRolesForMinistry(ministry: string) {
  return volunteerRoles.filter(
    (r) => r.ministry?.toLowerCase() === ministry.toLowerCase(),
  );
}

// --- Facilities and availability -------------------------------------------

export async function getFacilities(): Promise<Facility[]> {
  return facilities;
}

export async function getFacility(slug: string) {
  return facilities.find((f) => f.slug === slug) ?? null;
}

export async function getReservableFacilities() {
  return facilities.filter((f) => f.is_reservable);
}

export async function getAddons() {
  return addons;
}

/**
 * Deterministic pseudo-booking pattern.
 *
 * A real implementation queries reservations overlapping the day. This mirrors
 * the same shape so the availability grid, the sports dashboard and the
 * booking flow all read from one place and agree with each other.
 */
function seededBusy(courtId: string, dateKey: string, hour: number): boolean {
  let h = 0;
  const s = `${courtId}:${dateKey}:${hour}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // Evenings run busier than mornings, as they would in reality.
  const pressure = hour >= 18 ? 62 : hour >= 15 ? 42 : 22;
  return h % 100 < pressure;
}

export async function getCourtSlots(
  facilitySlug: string,
  courtId: string,
  date: string,
): Promise<Slot[]> {
  const facility = await getFacility(facilitySlug);
  if (!facility) return [];

  const open = Number(facility.open_time.slice(0, 2));
  const close = Number(facility.close_time.slice(0, 2));
  const out: Slot[] = [];
  const now = Date.now();

  for (let hour = open; hour < close; hour++) {
    const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+08:00`);
    const end = new Date(start.getTime() + 3600_000);

    let state: Slot["state"];
    if (end.getTime() <= now) {
      state = "unavailable";
    } else if (seededBusy(courtId, date, hour)) {
      state = hour % 7 === 3 ? "pending" : "reserved";
    } else {
      state = "available";
    }

    out.push({ start: start.toISOString(), end: end.toISOString(), state });
  }

  return out;
}

/** Today's picture across every court, for the public sports dashboard. */
export async function getSportsToday(date: string) {
  const hall = await getFacility("sports-hall");
  if (!hall) return [];

  return Promise.all(
    hall.courts.map(async (court) => {
      const slots = await getCourtSlots("sports-hall", court.id, date);
      const nextFree = slots.find((s) => s.state === "available") ?? null;
      const busyUntil = (() => {
        const firstFree = slots.findIndex((s) => s.state === "available");
        if (firstFree <= 0) return null;
        const blocking = slots
          .slice(0, firstFree)
          .filter((s) => s.state === "reserved" || s.state === "pending");
        return blocking.length ? blocking[blocking.length - 1].end : null;
      })();

      return { court, slots, nextFree, busyUntil };
    }),
  );
}

// --- Member dashboard -------------------------------------------------------

/** Demo reservations for the signed-in view. */
export async function getMyReservations(): Promise<Reservation[]> {
  const day = (n: number, h: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, 0) - 8 * 3600_000,
    ).toISOString();
  };

  return [
    {
      id: "r-1", facility_slug: "sports-hall", facility_name: "Sports Hall",
      court_id: "crt-pk1", court_name: "Pickleball 1", activity_name: null,
      starts_at: day(3, 19), ends_at: day(3, 20), status: "approved",
      participants: 4, total_cents: 90000,
    },
    {
      id: "r-2", facility_slug: "multipurpose-hall-2", facility_name: "Multipurpose Hall 2",
      court_id: null, court_name: null, activity_name: "Dgroup Leaders Planning",
      starts_at: day(8, 19), ends_at: day(8, 21), status: "pending",
      participants: 18, total_cents: 300000,
    },
    {
      id: "r-3", facility_slug: "sports-hall", facility_name: "Sports Hall",
      court_id: "crt-bb", court_name: "Basketball Court", activity_name: null,
      starts_at: day(-6, 15), ends_at: day(-6, 17), status: "completed",
      participants: 12, total_cents: 180000,
    },
  ];
}

// --- Site content -----------------------------------------------------------

export async function getActiveAnnouncement() {
  const t = Date.now();
  return (
    announcements.find(
      (a) =>
        a.is_sitewide &&
        new Date(a.starts_at).getTime() <= t &&
        (!a.ends_at || new Date(a.ends_at).getTime() > t),
    ) ?? null
  );
}

export async function getFaqs(category?: string) {
  return category ? faqs.filter((f) => f.category === category) : faqs;
}

export async function getResources() {
  return resources;
}

// --- Global search ----------------------------------------------------------

export interface SearchHit {
  kind: "Message" | "Event" | "Dgroup" | "Community" | "Facility" | "GLC" | "FAQ" | "Serve";
  title: string;
  excerpt: string;
  href: string;
}

export async function globalSearch(q: string): Promise<SearchHit[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const hits: SearchHit[] = [];
  const match = (...parts: (string | null | undefined)[]) =>
    parts.filter(Boolean).join(" ").toLowerCase().includes(needle);

  for (const m of await getMessages()) {
    if (match(m.title, m.description, m.scripture, m.speaker?.name, ...m.topics)) {
      hits.push({
        kind: "Message",
        title: m.title,
        excerpt: m.description ?? "",
        href: `/watch/messages/${m.slug}`,
      });
    }
  }
  for (const e of await getEvents()) {
    if (match(e.title, e.summary, e.description, e.category)) {
      hits.push({ kind: "Event", title: e.title, excerpt: e.summary ?? "", href: `/events/${e.slug}` });
    }
  }
  for (const d of dgroups) {
    if (match(d.name, d.description, d.general_area)) {
      hits.push({ kind: "Dgroup", title: d.name, excerpt: d.description ?? "", href: `/grow/find-a-dgroup` });
    }
  }
  for (const c of await getCommunities()) {
    if (match(c.name, c.tagline, c.description)) {
      hits.push({ kind: "Community", title: c.name, excerpt: c.tagline ?? "", href: `/communities/${c.slug}` });
    }
  }
  for (const f of facilities) {
    if (match(f.name, f.description)) {
      hits.push({ kind: "Facility", title: f.name, excerpt: f.description ?? "", href: `/centris/facilities/${f.slug}` });
    }
  }
  for (const p of glcPrograms) {
    if (match(p.title, p.description, p.code)) {
      hits.push({ kind: "GLC", title: `${p.code} — ${p.title}`, excerpt: p.description ?? "", href: "/grow/glc" });
    }
  }
  for (const f of faqs) {
    if (match(f.question, f.answer)) {
      hits.push({ kind: "FAQ", title: f.question, excerpt: f.answer, href: "/visit/faqs" });
    }
  }
  for (const r of volunteerRoles) {
    if (match(r.title, r.description)) {
      hits.push({ kind: "Serve", title: r.title, excerpt: r.description ?? "", href: `/serve/${r.slug}` });
    }
  }

  return hits;
}

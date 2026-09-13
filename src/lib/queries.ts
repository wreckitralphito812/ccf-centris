import "server-only";

import { getTeaching } from "@/lib/teaching-live";
import { getCurrentIntercede } from "@/lib/content/public-queries";
import { hasSupabase, supabaseAdmin, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { markSlots, type Busy } from "@/lib/availability";
import { addons, communities, facilities } from "@/data/center";
import {
  announcements,
  dgroups,
  events,
  glcClasses,
  glcPrograms,
  volunteerRoles,
} from "@/data/community";
import { buildServices } from "@/data/schedule";
import type {
  CcfEvent,
  Dgroup,
  Facility,
  Announcement,
  Message,
  ReservationAddon,
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
  const { messages } = await getTeaching();
  return [...messages].sort((a, b) => b.preached_on.localeCompare(a.preached_on));
}

export async function getLatestMessage(): Promise<Message | null> {
  const all = await getMessages();
  return all[0] ?? null;
}

export async function getMessage(slug: string): Promise<Message | null> {
  const { messages } = await getTeaching();
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
  const { series, speakers } = await getTeaching();
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
  return (await getTeaching()).series;
}

export async function getSeriesBySlug(slug: string) {
  const { series } = await getTeaching();
  return series.find((s) => s.slug === slug) ?? null;
}

export async function getSpeakers() {
  return (await getTeaching()).speakers;
}

export async function getSpeakerBySlug(slug: string) {
  const { speakers } = await getTeaching();
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

/**
 * Facilities, courts, and add-ons come from Postgres once Supabase is set, so
 * the ids the booking form submits are the same ids the reservation rows key
 * against. Without Supabase, the hand-authored catalogue in `@/data/center`
 * stands in — same shape, so pages never know which one they got.
 */

type FacilityRow = {
  id: string;
  slug: string;
  name: string;
  kind: Facility["kind"];
  description: string | null;
  capacity: number | null;
  floor_area_sqm: number | null;
  amenities: string[] | null;
  layouts: string[] | null;
  rules: string | null;
  accessibility: string | null;
  hero_image_url: string | null;
  gallery: string[] | null;
  is_reservable: boolean;
  requires_approval: boolean;
  hourly_rate_cents: number | null;
  currency: string;
  open_time: string;
  close_time: string;
  courts?: {
    id: string;
    name: string;
    sport: string;
    is_active: boolean;
    sort_order: number;
  }[];
};

function rowToFacility(r: FacilityRow): Facility {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    description: r.description,
    capacity: r.capacity,
    floor_area_sqm: r.floor_area_sqm,
    amenities: r.amenities ?? [],
    layouts: r.layouts ?? [],
    rules: r.rules,
    accessibility: r.accessibility,
    hero_image_url: r.hero_image_url,
    gallery: r.gallery ?? [],
    is_reservable: r.is_reservable,
    requires_approval: r.requires_approval,
    hourly_rate_cents: r.hourly_rate_cents,
    currency: r.currency,
    open_time: r.open_time.slice(0, 5),
    close_time: r.close_time.slice(0, 5),
    courts: [...(r.courts ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        sport: c.sport,
        is_active: c.is_active,
      })),
  };
}

const FACILITY_SELECT =
  "*, courts(id, name, sport, is_active, sort_order)";

async function liveFacilities(): Promise<Facility[] | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabaseAdmin()
    .from("facilities")
    .select(FACILITY_SELECT)
    .eq("satellite_id", SATELLITE_ID)
    .order("sort_order");
  if (error) {
    console.error("liveFacilities failed", error);
    return null;
  }
  return (data as FacilityRow[]).map(rowToFacility);
}

export async function getFacilities(): Promise<Facility[]> {
  return (await liveFacilities()) ?? facilities;
}

export async function getFacility(slug: string): Promise<Facility | null> {
  const live = await liveFacilities();
  if (live) return live.find((f) => f.slug === slug) ?? null;
  return facilities.find((f) => f.slug === slug) ?? null;
}

export async function getReservableFacilities(): Promise<Facility[]> {
  return (await getFacilities()).filter((f) => f.is_reservable);
}

export async function getAddons(): Promise<ReservationAddon[]> {
  if (hasSupabase()) {
    const { data, error } = await supabaseAdmin()
      .from("reservation_addons")
      .select("id, slug, name, unit, price_cents")
      .eq("satellite_id", SATELLITE_ID)
      .eq("is_active", true)
      .order("slug");
    if (!error && data) return data as ReservationAddon[];
    if (error) console.error("getAddons failed", error);
  }
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

  // Live: mark the grid from real reservations + blackouts touching this day.
  if (hasSupabase()) {
    const db = supabaseAdmin();
    const dayStart = new Date(`${date}T00:00:00+08:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59+08:00`).toISOString();
    const range = `[${dayStart},${dayEnd})`;

    const { data: fac } = await db
      .from("facilities")
      .select("id")
      .eq("satellite_id", SATELLITE_ID)
      .eq("slug", facilitySlug)
      .single();

    const busy: Busy[] = [];
    if (fac) {
      const [{ data: res }, { data: blk }] = await Promise.all([
        db
          .from("reservations")
          .select("during, status")
          .eq("court_id", courtId)
          .in("status", ["pending", "approved"])
          .overlaps("during", range),
        db
          .from("facility_blackouts")
          .select("during")
          .or(`court_id.eq.${courtId},and(court_id.is.null,facility_id.eq.${fac.id})`)
          .overlaps("during", range),
      ]);

      for (const row of res ?? []) {
        const [start, end] = parseRange(row.during as string);
        busy.push({ start, end, kind: row.status === "approved" ? "reserved" : "pending" });
      }
      for (const row of blk ?? []) {
        const [start, end] = parseRange(row.during as string);
        busy.push({ start, end, kind: "blackout" });
      }
    }

    return markSlots(date, open, close, busy);
  }

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

/** Parse a Postgres `tstzrange` literal `["2026-...","2026-...")` to ISO endpoints. */
function parseRange(raw: string): [string, string] {
  const m = raw.match(/[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/);
  if (!m) return [raw, raw];
  return [new Date(m[1]).toISOString(), new Date(m[2]).toISOString()];
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


// --- Signed-in member's own bookings ------------------------------------

export interface MyBooking {
  id: string;
  facility_name: string | null;
  court_name: string | null;
  activity_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  participants: number;
  created_at: string;
}

/**
 * The current user's reservations, newest first. Runs under the caller's
 * session (RLS `reservations_self_read`), so it only ever returns their rows.
 * Empty when signed out or offline.
 */
export async function getMyBookings(): Promise<MyBooking[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, activity_name, participants, during, status, created_at, facilities(name), courts(name)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyBookings failed", error);
    return [];
  }

  return (data ?? []).map((r) => {
    const [starts_at, ends_at] = parseRange(r.during as string);
    const facility = one(r.facilities as { name: string } | { name: string }[] | null);
    const court = one(r.courts as { name: string } | { name: string }[] | null);
    return {
      id: r.id as string,
      facility_name: facility?.name ?? null,
      court_name: court?.name ?? null,
      activity_name: (r.activity_name as string | null) ?? null,
      starts_at,
      ends_at,
      status: r.status as string,
      participants: r.participants as number,
      created_at: r.created_at as string,
    };
  });
}

// --- Admin queues ---------------------------------------------------------

/** Supabase embeds a to-one relation as either an object or a one-element array. */
function one<T>(rel: T | T[] | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

export interface AdminReservation {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_mobile: string | null;
  organization: string | null;
  activity_name: string | null;
  purpose: string | null;
  participants: number;
  facility_name: string | null;
  court_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
}

export interface AdminInquiry {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  message: string | null;
  age_bracket?: string | null;
  subject: string | null;
  status: string;
  created_at: string;
}

/** Every reservation for the satellite, newest first. Empty offline. */
export async function getReservations(): Promise<AdminReservation[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("reservations")
    .select(
      "id, contact_name, contact_email, contact_mobile, organization, activity_name, purpose, participants, during, status, created_at, facilities(name), courts(name)",
    )
    .eq("satellite_id", SATELLITE_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getReservations failed", error);
    return [];
  }

  return (data ?? []).map((r) => {
    const [starts_at, ends_at] = parseRange(r.during as string);
    const facility = one(r.facilities as { name: string } | { name: string }[] | null);
    const court = one(r.courts as { name: string } | { name: string }[] | null);
    return {
      id: r.id as string,
      contact_name: r.contact_name as string,
      contact_email: r.contact_email as string,
      contact_mobile: (r.contact_mobile as string | null) ?? null,
      organization: (r.organization as string | null) ?? null,
      activity_name: (r.activity_name as string | null) ?? null,
      purpose: (r.purpose as string | null) ?? null,
      participants: r.participants as number,
      facility_name: facility?.name ?? null,
      court_name: court?.name ?? null,
      starts_at,
      ends_at,
      status: r.status as string,
      created_at: r.created_at as string,
    };
  });
}

/** Dgroup inquiries, newest first. Empty offline. */
export async function getDgroupInquiries(): Promise<AdminInquiry[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("dgroup_inquiries")
    .select(
      "id, full_name, email, mobile, message, age_bracket, status, created_at, dgroups(name)",
    )
    .eq("satellite_id", SATELLITE_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getDgroupInquiries failed", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    full_name: r.full_name as string,
    email: r.email as string,
    mobile: (r.mobile as string | null) ?? null,
    message: (r.message as string | null) ?? null,
    age_bracket: (r.age_bracket as string | null) ?? null,
    subject:
      one(r.dgroups as { name: string } | { name: string }[] | null)?.name ?? null,
    status: r.status as string,
    created_at: r.created_at as string,
  }));
}

/** Volunteer applications, newest first. Empty offline. */
export async function getVolunteerApplications(): Promise<AdminInquiry[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("volunteer_applications")
    .select(
      "id, full_name, email, mobile, message, status, created_at, volunteer_roles(title)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getVolunteerApplications failed", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    full_name: r.full_name as string,
    email: r.email as string,
    mobile: (r.mobile as string | null) ?? null,
    message: (r.message as string | null) ?? null,
    subject:
      one(r.volunteer_roles as { title: string } | { title: string }[] | null)
        ?.title ?? null,
    status: r.status as string,
    created_at: r.created_at as string,
  }));
}

// --- Site content -----------------------------------------------------------

/**
 * The one site-wide banner. A live signal from synced content wins over the
 * seed list: an Intercede Prayer & Fasting week that is running (or starts
 * within a week) is the most time-sensitive thing a visitor should see.
 */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const intercede = await getCurrentIntercede();
  if (intercede && (intercede.active || (intercede.startsInDays ?? 99) <= 7)) {
    const when = intercede.active
      ? "is happening now"
      : intercede.startsInDays === 0
        ? "starts today"
        : intercede.startsInDays === 1
          ? "starts tomorrow"
          : `starts in ${intercede.startsInDays} days`;
    return {
      id: "intercede-live",
      title: `${intercede.campaign.campaignTitle} ${when}`,
      body: null,
      level: "info",
      is_sitewide: true,
      starts_at: new Date().toISOString(),
      ends_at: intercede.campaign.endDate
        ? `${intercede.campaign.endDate}T23:59:59+08:00`
        : null,
      // /intercede is gone (pulled with the rest of the Grow section), so
      // this banner — which can appear on any page whenever a campaign is
      // synced in — no longer has a page of its own to send people to.
      link_href: "/contact",
      link_label: "Ask us about it",
    };
  }

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

// --- Synchronized CCF public content --------------------------------------
// Backed by src/data/generated/public-content.json, refreshed by
// `npm run content:sync`. See src/lib/content/public-queries.ts.

export {
  findResources,
  getResourceFacets,
  getChronicleIssues,
  getChronicleGroups,
  getScriptureMemory,
  getScriptureYears,
  getCurrentScriptureMemory,
  getCurrentIntercede,
  getGlcCatalogue,
  getGlcCatalogueGroups,
  getFourWsWeeks,
  getCurrentFourWs,
  getFourWsGuide,
  getCurrentFourWsGuide,
  getSyncMeta,
} from "@/lib/content/public-queries";
export type {
  ResourceFilters,
  ChronicleGroup,
  IntercedeView,
  GlcCategoryGroup,
  FourWsWeekView,
  FourWsCurrent,
  SyncMeta,
} from "@/lib/content/public-queries";

// --- Global search ----------------------------------------------------------

export interface SearchHit {
  kind: "Message" | "Event" | "Dgroup" | "Facility";
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
  for (const f of facilities) {
    if (match(f.name, f.description)) {
      hits.push({ kind: "Facility", title: f.name, excerpt: f.description ?? "", href: `/centris/facilities/${f.slug}` });
    }
  }

  return hits;
}

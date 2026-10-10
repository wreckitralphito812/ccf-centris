import "server-only";

import { EVENT_CATEGORIES } from "@/lib/events";
import { getTeaching } from "@/lib/teaching-live";
import { getCurrentIntercede } from "@/lib/content/public-queries";
import { hasSupabase, supabaseAdmin, SATELLITE_ID } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/session";
import { markSlots, type Busy } from "@/lib/availability";
import type { DgroupHold } from "@/lib/dgroup-tables";
import { mergeUpcoming, type Upcoming } from "@/lib/my-bookings";
import { buildSiteStats, type SiteStats, type StatsInput } from "@/lib/site-stats";
import { blocksAsHolds, type TableBlock } from "@/lib/dgroup-blocks";
import { fmtDayLong, manilaDateKey } from "@/lib/format";
import { KIND_ORDER, matchScore, PAGES, queryTerms, type SearchHit } from "@/lib/search";
import { getSundayServices } from "@/lib/services";
import { getSeriesArchive } from "@/lib/channel";
import { getFourWsGuides as getFourWsGuidesForSearch, getFourWsWeeks as getFourWsWeeksForSearch } from "@/lib/content/public-queries";
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
  // Registered Dgroups (2026-10-08) aren't tied to communities, and the seed
  // groups are samples: with a database, there are none to count.
  if (hasSupabase()) return [];
  return dgroups.filter((d) => d.community_slug === slug && d.is_open);
}

// --- Events -----------------------------------------------------------------

/**
 * Published events. With a database these are the ministries' approved
 * announcements (2026-10-05); without one, the seed data. Calendar-only
 * bookings (other satellites' events at Centris) are left out unless asked
 * for: only the month calendar shows them (2026-10-06).
 */
export async function getEvents(opts: { includeCalendarOnly?: boolean } = {}): Promise<CcfEvent[]> {
  if (!hasSupabase()) return [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  let q = supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("status", "published");
  if (!opts.includeCalendarOnly) q = q.eq("calendar_only", false);
  const { data, error } = await q.order("starts_at");
  if (error) {
    console.error("getEvents failed", error);
    return [];
  }
  return (data ?? []).map(eventFromRow);
}

const EVENT_COLUMNS =
  "id, slug, title, summary, description, category, cover_image_url, starts_at, ends_at, location_note, organizer, capacity, seats_taken, requires_registration, price_cents, currency, requirements, ministry, registration_url, fee_note, artwork, status, review_note, submitted_by, created_at, calendar_only, event_dates(starts_at, ends_at, all_day)";

function eventFromRow(r: Record<string, unknown>): CcfEvent {
  const dates = ((r.event_dates as { starts_at: string; ends_at: string | null; all_day: boolean }[] | null) ?? [])
    .slice()
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    summary: (r.summary as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    cover_image_url: (r.cover_image_url as string | null) ?? null,
    starts_at: r.starts_at as string,
    ends_at: (r.ends_at as string | null) ?? null,
    location_note: (r.location_note as string | null) ?? null,
    organizer: (r.organizer as string | null) ?? null,
    capacity: (r.capacity as number | null) ?? null,
    seats_taken: (r.seats_taken as number) ?? 0,
    requires_registration: Boolean(r.requires_registration),
    price_cents: (r.price_cents as number) ?? 0,
    currency: (r.currency as string) ?? "PHP",
    requirements: (r.requirements as string | null) ?? null,
    community_slug: null,
    dates: dates.length ? dates : [{ starts_at: r.starts_at as string, ends_at: (r.ends_at as string | null) ?? null }],
    registration_url: (r.registration_url as string | null) ?? null,
    fee_note: (r.fee_note as string | null) ?? null,
    ministry: (r.ministry as string | null) ?? null,
    artwork: (r.artwork as Record<string, string> | null) ?? {},
    status: r.status as string,
    review_note: (r.review_note as string | null) ?? null,
    submitted_by: (r.submitted_by as string | null) ?? null,
    created_at: r.created_at as string,
    calendar_only: Boolean(r.calendar_only),
  };
}

/** A member's own announcements, newest first (2026-10-05). */
export async function getMyAnnouncements(memberId: string): Promise<CcfEvent[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("submitted_by", memberId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) console.error("getMyAnnouncements failed", error);
  return (data ?? []).map(eventFromRow);
}

/** One of a member's own announcements, for editing. */
export async function getMyAnnouncement(memberId: string, id: string): Promise<CcfEvent | null> {
  if (!hasSupabase()) return null;
  const { data } = await supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("submitted_by", memberId)
    .eq("id", id)
    .maybeSingle();
  return data ? eventFromRow(data) : null;
}

/** Every submitted or published announcement, for the admin queue. */
export async function getAnnouncementQueue(): Promise<CcfEvent[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .in("status", ["pending", "changes_requested", "published", "declined", "cancelled"])
    .order("starts_at")
    .limit(300);
  if (error) console.error("getAnnouncementQueue failed", error);
  return (data ?? []).map(eventFromRow);
}

/**
 * Every event the admin events page manages (2026-10-08): published, hidden
 * (`draft`) and calendar-only, past and future. Reps' submissions that are
 * still in review stay on the announcements page.
 */
export async function getAdminEvents(): Promise<CcfEvent[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .in("status", ["published", "draft", "completed"])
    .order("starts_at")
    .limit(500);
  if (error) console.error("getAdminEvents failed", error);
  return (data ?? []).map(eventFromRow);
}

/** One event for the admin edit page, whatever its status. */
export async function getAdminEvent(id: string): Promise<CcfEvent | null> {
  if (!hasSupabase() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getAdminEvent failed", error);
  return data ? eventFromRow(data) : null;
}

export interface AnnouncementRep {
  id: string;
  email: string;
  name: string | null;
  ministry: string | null;
  requested_at: string;
  approved_at: string | null;
}

/** Who may submit, and who's asking (approved_at null). */
export async function getAnnouncementReps(): Promise<AnnouncementRep[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("announcement_reps")
    .select("id, email, name, ministry, requested_at, approved_at")
    .eq("satellite_id", SATELLITE_ID)
    .order("requested_at", { ascending: false });
  if (error) console.error("getAnnouncementReps failed", error);
  return (data ?? []) as AnnouncementRep[];
}

/** This member's standing as a rep: approved, asked, or neither. */
export async function getRepStatus(email: string): Promise<"approved" | "requested" | "none"> {
  if (!hasSupabase() || !email) return "none";
  const { data } = await supabaseAdmin()
    .from("announcement_reps")
    .select("approved_at")
    .eq("satellite_id", SATELLITE_ID)
    .ilike("email", email.replace(/[%_]/g, "\\$&"))
    .maybeSingle();
  if (!data) return "none";
  return data.approved_at ? "approved" : "requested";
}

export async function getUpcomingEvents(limit?: number, opts: { includeCalendarOnly?: boolean } = {}): Promise<CcfEvent[]> {
  const t = Date.now();
  const out = (await getEvents(opts)).filter(
    (e) => new Date(e.ends_at ?? e.starts_at).getTime() > t,
  );
  return typeof limit === "number" ? out.slice(0, limit) : out;
}

export async function getEvent(slug: string): Promise<CcfEvent | null> {
  if (!hasSupabase()) return events.find((e) => e.slug === slug) ?? null;
  const { data } = await supabaseAdmin()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("slug", slug)
    .eq("calendar_only", false)
    .in("status", ["published", "completed"])
    .maybeSingle();
  return data ? eventFromRow(data) : null;
}

export async function getEventsForCommunity(slug: string) {
  const t = Date.now();
  return events
    .filter((e) => e.community_slug === slug)
    .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() > t)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** The fixed categories first (see lib/events), then any others in use. */
export async function getEventCategories() {
  const fixed = EVENT_CATEGORIES.map((c) => c.name as string);
  const all = await getEvents();
  const used = [...new Set(all.map((e) => e.category).filter(Boolean))].sort() as string[];
  return [...fixed, ...used.filter((c) => !fixed.includes(c))];
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
  /** Rooms asked for together share this, and it makes the reference code. */
  request_group: string | null;
}

/**
 * The current user's reservations, newest first. Runs with the service role,
 * so the `user_id` filter is what keeps it to their rows.
 * Empty when signed out or offline.
 */
export async function getMyBookings(): Promise<MyBooking[]> {
  if (!hasSupabase()) return [];
  const user = await currentUser();
  if (!user) return [];

  const { data, error } = await supabaseAdmin()
    .from("reservations")
    .select(
      "id, activity_name, participants, during, status, created_at, request_group, facilities(name), courts(name)",
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
      request_group: (r.request_group as string | null) ?? null,
    };
  });
}

/** The signed-in member's details, to prefill booking forms. */
export interface MyContact {
  name: string;
  email: string;
  mobile: string;
}

export async function getMyContact(): Promise<MyContact | null> {
  if (!hasSupabase()) return null;
  const user = await currentUser();
  if (!user) return null;

  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("first_name, last_name, full_name, mobile")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
    ((data?.full_name as string | null) ?? "");
  return { name, email: user.email, mobile: (data?.mobile as string | null) ?? "" };
}

export interface MyDgroupBooking {
  id: string;
  room_slug: string;
  table_labels: string[];
  booked_on: string;
  slot_id: string;
  group_size: number;
}

/**
 * The current user's confirmed Dgroup tables from `today` on, soonest first.
 * Service role, so the `user_id` filter is what keeps it to their rows.
 */
export async function getMyDgroupBookings(today: string): Promise<MyDgroupBooking[]> {
  if (!hasSupabase()) return [];
  const user = await currentUser();
  if (!user) return [];

  const { data, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .select("id, room_slug, table_labels, booked_on, slot_id, group_size")
    .eq("satellite_id", SATELLITE_ID)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .gte("booked_on", today)
    .order("booked_on")
    .order("slot_id");
  if (error) {
    console.error("getMyDgroupBookings failed", error);
    return [];
  }
  return (data ?? []) as MyDgroupBooking[];
}

/** Every upcoming booking the member has, tables and rooms, soonest first. */
export async function getMyUpcoming(today: string): Promise<Upcoming[]> {
  const [tables, rooms] = await Promise.all([getMyDgroupBookings(today), getMyBookings()]);
  return mergeUpcoming(tables, rooms);
}

/**
 * Every table held on the given days, for the booking form's "tables free"
 * counts. One read for the whole week rather than one per slot. Holds only,
 * no names. Null when it can't be read, and the form then books without
 * showing counts.
 */
export async function getDgroupHolds(dates: string[]): Promise<DgroupHold[] | null> {
  if (!hasSupabase() || !dates.length) return [];
  const [{ data, error }, blocks] = await Promise.all([
    supabaseAdmin()
      .from("dgroup_table_bookings")
      .select("booked_on, slot_id, room_slug, table_labels")
      .eq("satellite_id", SATELLITE_ID)
      .in("booked_on", dates)
      .in("status", ["pending", "confirmed"]),
    getTableBlocks({ dates }),
  ]);
  if (error) {
    console.error("getDgroupHolds failed", error);
    return null;
  }
  // Blocked tables count as taken (2026-10-03).
  return [...((data ?? []) as DgroupHold[]), ...blocksAsHolds(blocks)];
}

/** Admin blocks on Dgroup tables, for some dates or from a date on. */
export async function getTableBlocks(when: { dates?: string[]; from?: string; to?: string }): Promise<TableBlock[]> {
  if (!hasSupabase()) return [];
  let q = supabaseAdmin()
    .from("dgroup_table_blocks")
    .select("id, room_slug, table_label, booked_on, slot_id, reason")
    .eq("satellite_id", SATELLITE_ID);
  if (when.dates) q = q.in("booked_on", when.dates);
  if (when.from) q = q.gte("booked_on", when.from);
  if (when.to) q = q.lte("booked_on", when.to);
  const { data, error } = await q.order("booked_on").order("room_slug");
  if (error) {
    // Before migration 0015 the table doesn't exist; treat as no blocks.
    console.error("getTableBlocks failed", error);
    return [];
  }
  return (data ?? []) as TableBlock[];
}

export interface RoomBlock {
  id: string;
  facility_name: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

/** Room blackouts (facility_blackouts) overlapping [from, to). */
export async function getRoomBlocks(fromIso: string, toIso: string): Promise<RoomBlock[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("facility_blackouts")
    .select("id, during, reason, facilities!inner(name, satellite_id)")
    .eq("facilities.satellite_id", SATELLITE_ID)
    .is("court_id", null)
    .overlaps("during", `[${fromIso},${toIso})`);
  if (error) {
    console.error("getRoomBlocks failed", error);
    return [];
  }
  return (data ?? [])
    .map((r) => {
      const [starts_at, ends_at] = parseRange(r.during as string);
      return {
        id: r.id as string,
        facility_name: one(r.facilities as { name: string } | { name: string }[] | null)?.name ?? "Room",
        starts_at,
        ends_at,
        reason: (r.reason as string | null) ?? null,
      };
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
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
  /** Shared by every room in one ministry request; null for older rows. */
  request_group: string | null;
  layout: string | null;
  equipment: Record<string, number> | null;
  food: string | null;
}

/** The `name` of a row PostgREST embedded (as an object, or a one-item list). */
const embeddedName = (v: unknown): string | null =>
  ((Array.isArray(v) ? v[0] : v) as { name?: string } | null | undefined)?.name ?? null;

/** A Dgroup table request in the admin queue. */
export interface AdminDgroupTable {
  id: string;
  leader_name: string;
  contact_mobile: string;
  group_size: number;
  room_slug: string;
  table_label: string;
  table_labels: string[];
  table_seats: number;
  leader_email: string | null;
  booked_on: string;
  slot_id: string;
  status: string;
  created_at: string;
  decided_at: string | null;
  /** The registered Dgroup the booking is for, when the leader picked one (2026-10-08). */
  dgroup_name?: string | null;
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
/**
 * Every Dgroup table request for the admin queue, newest first. Pending ones
 * are holding their table, so this is a queue worth clearing promptly.
 */
export async function getDgroupTableBookings(): Promise<AdminDgroupTable[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .select(
      "id, leader_name, contact_mobile, leader_email, group_size, room_slug, table_label, table_labels, table_seats, booked_on, slot_id, status, created_at, decided_at, dgroups(name)",
    )
    .eq("satellite_id", SATELLITE_ID)
    .order("booked_on", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getDgroupTableBookings failed", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    leader_name: r.leader_name as string,
    contact_mobile: r.contact_mobile as string,
    group_size: r.group_size as number,
    room_slug: r.room_slug as string,
    table_label: r.table_label as string,
    table_labels: (r.table_labels as string[] | null) ?? [r.table_label as string],
    table_seats: r.table_seats as number,
    leader_email: (r.leader_email as string | null) ?? null,
    dgroup_name: embeddedName(r.dgroups),
    booked_on: r.booked_on as string,
    slot_id: r.slot_id as string,
    status: r.status as string,
    created_at: r.created_at as string,
    decided_at: (r.decided_at as string | null) ?? null,
  }));
}

export async function getReservations(): Promise<AdminReservation[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("reservations")
    .select(
      "id, contact_name, contact_email, contact_mobile, organization, activity_name, purpose, participants, during, status, created_at, request_group, layout, equipment, food, facilities(name), courts(name)",
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
      request_group: (r.request_group as string | null) ?? null,
      layout: (r.layout as string | null) ?? null,
      equipment: (r.equipment as Record<string, number> | null) ?? null,
      food: (r.food as string | null) ?? null,
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

export type { SearchHit } from "@/lib/search";

/** Most results of one kind to show, so a common word doesn't bury the rest. */
const PER_KIND = 12;

/**
 * Site search across pages, events, 4Ws guides, the Sunday archive and
 * facilities (2026-10-10; it used to cover events and facilities only). Every
 * word of the query must match; title matches rank first. The YouTube-backed
 * sources fail soft to nothing.
 */
export async function globalSearch(q: string): Promise<SearchHit[]> {
  const terms = queryTerms(q.slice(0, 100));
  if (!terms.length) return [];

  const [allEvents, guides, weeks, sunday, series] = await Promise.all([
    getEvents(),
    getFourWsGuidesForSearch(),
    getFourWsWeeksForSearch(),
    getSundayServices().catch(() => null),
    getSeriesArchive().catch(() => []),
  ]);
  const weekBySlug = new Map(weeks.map((w) => [w.slug, w]));

  const scored: (SearchHit & { score: number })[] = [];
  const add = (score: number, hit: SearchHit) => {
    if (score > 0) scored.push({ ...hit, score });
  };

  for (const p of PAGES) {
    add(matchScore(terms, p.title, p.excerpt, p.keywords), { kind: "Page", title: p.title, excerpt: p.excerpt, href: p.href });
  }
  const now = Date.now();
  for (const e of allEvents) {
    const score = matchScore(terms, e.title, e.summary, e.description, e.category, e.ministry);
    // Upcoming events before past ones with the same match.
    const upcoming = new Date(e.ends_at ?? e.starts_at).getTime() > now;
    add(score && score + (upcoming ? 1 : 0), {
      kind: "Event",
      title: e.title,
      excerpt: e.summary ?? "",
      href: `/events/${e.slug}`,
    });
  }
  for (const g of guides) {
    const week = weekBySlug.get(g.slug);
    const passage = g.word?.passageRef ?? null;
    add(
      matchScore(terms, g.title, passage, g.memoryVerseReference, week?.seriesTitle, g.welcome, g.word?.talkAbout.join(" ")),
      {
        kind: "4Ws guide",
        title: g.title,
        excerpt: [week?.dateSpan ?? g.dateLabel, passage, week?.seriesTitle].filter(Boolean).join(" · "),
        href: `/watch/4ws/${g.slug}`,
      },
    );
  }
  for (const s of sunday?.archive ?? []) {
    add(matchScore(terms, s.title, s.description.slice(0, 600)), {
      kind: "Sunday service",
      title: s.title,
      excerpt: s.servedOn ? fmtDayLong(s.servedOn) : "",
      href: `/watch/archive/${s.videoId}`,
    });
  }
  for (const g of series) {
    if (!g.main) continue;
    add(matchScore(terms, g.series, g.main.description.slice(0, 600)), {
      kind: "Series",
      title: g.series,
      excerpt: `${g.year ? `${g.year} · ` : ""}Sunday series on CCF's YouTube channel`,
      href: g.main.href,
      external: true,
    });
  }
  for (const f of facilities) {
    add(matchScore(terms, f.name, f.description), {
      kind: "Facility",
      title: f.name,
      excerpt: f.description ?? "",
      href: `/centris/facilities/${f.slug}`,
    });
  }

  const hits: SearchHit[] = [];
  for (const kind of KIND_ORDER) {
    scored
      .filter((h) => h.kind === kind)
      .sort((a, b) => b.score - a.score)
      .slice(0, PER_KIND)
      .forEach(({ score: _score, ...h }) => hits.push(h)); // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  return hits;
}

/**
 * Everything the admin Analytics page counts, in one go (2026-10-03).
 * Null without a database; the page then says it isn't connected.
 */
export async function getSiteStats(): Promise<SiteStats | null> {
  if (!hasSupabase()) return null;
  const db = supabaseAdmin();
  const month = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [members, joined, tables, rooms, posts, prayers] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", month),
    db
      .from("dgroup_table_bookings")
      .select("status, booked_on, slot_id, room_slug, group_size, created_at")
      .eq("satellite_id", SATELLITE_ID),
    db
      .from("reservations")
      .select("id, status, created_at, during, request_group, facilities(name)")
      .eq("satellite_id", SATELLITE_ID),
    db
      .from("prayer_wall_posts")
      .select("created_at, expires_at, hidden_at, answered_at")
      .eq("satellite_id", SATELLITE_ID),
    db.from("prayer_wall_prayers").select("post_id", { count: "exact", head: true }),
  ]);
  for (const r of [members, joined, tables, rooms, posts, prayers]) {
    if (r.error) console.error("getSiteStats failed", r.error);
  }
  return buildSiteStats({
    today: manilaDateKey(),
    now: new Date(),
    members: { total: members.count ?? 0, joined30: joined.count ?? 0 },
    tables: (tables.data ?? []) as StatsInput["tables"],
    rooms: (rooms.data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      starts_at: parseRange(r.during as string)[0],
      request_group: (r.request_group as string | null) ?? null,
      facility_name: one(r.facilities as { name: string } | { name: string }[] | null)?.name ?? null,
    })),
    posts: (posts.data ?? []) as StatsInput["posts"],
    prayers: prayers.count ?? 0,
  });
}

/**
 * Admin search across Dgroup table bookings and room requests (2026-10-03):
 * name, email, mobile, event or ministry, newest first, 40 of each at most.
 * Filters the admin lists in memory: one satellite's bookings are few.
 */
export async function searchBookings(raw: string): Promise<{ tables: AdminDgroupTable[]; rooms: AdminReservation[] }> {
  const q = raw.trim().toLowerCase().slice(0, 60);
  if (!hasSupabase() || q.length < 2) return { tables: [], rooms: [] };
  const digits = q.replace(/\s/g, "");
  const has = (v: string | null | undefined) =>
    Boolean(v && (v.toLowerCase().includes(q) || (/^[\d+]+$/.test(digits) && v.replace(/\s/g, "").includes(digits))));
  const [tables, rooms] = await Promise.all([getDgroupTableBookings(), getReservations()]);
  return {
    tables: tables
      .filter((t) => has(t.leader_name) || has(t.leader_email) || has(t.contact_mobile) || has(t.dgroup_name))
      .sort((a, b) => b.booked_on.localeCompare(a.booked_on))
      .slice(0, 40),
    rooms: rooms
      .filter((r) => has(r.contact_name) || has(r.contact_email) || has(r.activity_name) || has(r.organization) || has(r.contact_mobile))
      .slice(0, 40),
  };
}

// --- Dgroup registry (2026-10-08) --------------------------------------------

/** A Dgroup a leader registered. Only admins and its own leader see it. */
export interface RegisteredDgroup {
  id: string;
  name: string;
  audience: string;
  day_of_week: number | null;
  start_time: string | null;
  frequency: string;
  meets_where: string;
  general_area: string | null;
  current_size: number;
  is_open: boolean;
  leader_id: string | null;
  leader_name: string | null;
  leader_mobile: string | null;
  leader_email: string | null;
  co_leader_name: string | null;
  description: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

const DGROUP_COLUMNS =
  "id, name, audience, day_of_week, start_time, frequency, meets_where, general_area, current_size, is_open, leader_id, leader_name, leader_mobile, leader_email, co_leader_name, description, status, review_note, created_at, reviewed_at, updated_at";

/** This member's Dgroups, newest first. Scoped to the member, never an id from the request. */
export async function getMyDgroups(memberId: string): Promise<RegisteredDgroup[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("dgroups")
    .select(DGROUP_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("leader_id", memberId)
    .order("created_at", { ascending: false });
  if (error) console.error("getMyDgroups failed", error);
  return (data ?? []) as RegisteredDgroup[];
}

/** One of this member's Dgroups, or null if it isn't theirs. */
export async function getMyDgroup(memberId: string, id: string): Promise<RegisteredDgroup | null> {
  if (!hasSupabase() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabaseAdmin()
    .from("dgroups")
    .select(DGROUP_COLUMNS)
    .eq("satellite_id", SATELLITE_ID)
    .eq("leader_id", memberId)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getMyDgroup failed", error);
  return (data as RegisteredDgroup | null) ?? null;
}

/** Every registered Dgroup with how often it has booked tables, for the admin console. */
export async function getRegisteredDgroups(): Promise<(RegisteredDgroup & { bookings: number; last_booked: string | null })[]> {
  if (!hasSupabase()) return [];
  const db = supabaseAdmin();
  const [{ data, error }, { data: bookings }] = await Promise.all([
    db.from("dgroups").select(DGROUP_COLUMNS).eq("satellite_id", SATELLITE_ID).order("created_at", { ascending: false }),
    db
      .from("dgroup_table_bookings")
      .select("dgroup_id, booked_on")
      .eq("satellite_id", SATELLITE_ID)
      .eq("status", "confirmed")
      .not("dgroup_id", "is", null),
  ]);
  if (error) console.error("getRegisteredDgroups failed", error);
  const stats = new Map<string, { bookings: number; last_booked: string | null }>();
  for (const b of (bookings ?? []) as { dgroup_id: string; booked_on: string }[]) {
    const s = stats.get(b.dgroup_id) ?? { bookings: 0, last_booked: null };
    s.bookings += 1;
    if (!s.last_booked || b.booked_on > s.last_booked) s.last_booked = b.booked_on;
    stats.set(b.dgroup_id, s);
  }
  return ((data ?? []) as RegisteredDgroup[]).map((d) => ({ ...d, ...(stats.get(d.id) ?? { bookings: 0, last_booked: null }) }));
}

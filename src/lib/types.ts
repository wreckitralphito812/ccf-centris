/**
 * Domain types. These mirror the Postgres schema in supabase/migrations
 * one to one, so the seed repository and a live Supabase client are
 * interchangeable behind the queries in lib/queries.ts.
 */

export type ServiceStatus = "scheduled" | "live" | "ended" | "cancelled";
export type MeetingMode = "in_person" | "online" | "hybrid";
export type DgroupAudience =
  | "men"
  | "women"
  | "couples"
  | "singles"
  | "students"
  | "young_professionals"
  | "families"
  | "mixed";
export type FacilityKind =
  | "worship_hall"
  | "sports_hall"
  | "court"
  | "multipurpose"
  | "lounge"
  | "welcome_center";
export type ReservationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";
export type AnnouncementLevel = "info" | "notice" | "urgent";

export interface Speaker {
  id: string;
  slug: string;
  name: string;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
}

export interface Series {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  artwork_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
}

export interface Venue {
  id: string;
  name: string;
  floor: string | null;
  capacity: number | null;
}

export interface Service {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  status: ServiceStatus;
  venue: Venue | null;
  series: Series | null;
  speaker: Speaker | null;
  livestream_key: string | null;
  nxtgen_available: boolean;
  notes: string | null;
}

export interface FourWs {
  id: string;
  message_id: string | null;
  title: string;
  week_of: string;
  welcome_md: string | null;
  worship_md: string | null;
  word_md: string | null;
  works_md: string | null;
  pdf_url: string | null;
}

export interface Message {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  scripture: string | null;
  preached_on: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  full_video_key: string | null;
  sermon_video_key: string | null;
  audio_url: string | null;
  transcript: string | null;
  notes_md: string | null;
  topics: string[];
  bible_books: string[];
  series: Series | null;
  speaker: Speaker | null;
  four_ws: FourWs | null;
  /**
   * Other preachers who delivered this same message on the same Sunday. CCF
   * runs multiple services with different speakers and uploads each one, so a
   * message has one lead recording and sometimes a second.
   */
  also_preached_by?: { speaker: Speaker; video_key: string }[];
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  life_stage: string | null;
  hero_image_url: string | null;
  accent: string | null;
  meeting_note: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Dgroup {
  id: string;
  name: string;
  community_slug: string | null;
  general_area: string | null;
  audience: DgroupAudience;
  mode: MeetingMode;
  language: string;
  age_min: number | null;
  age_max: number | null;
  day_of_week: number | null;
  start_time: string | null;
  description: string | null;
  seats_left: number | null;
  leader_first_name: string | null;
  is_open: boolean;
}

export interface GlcProgram {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  description: string | null;
  level: number | null;
}

export interface GlcClass {
  id: string;
  program: GlcProgram;
  starts_on: string;
  ends_on: string | null;
  schedule_note: string | null;
  capacity: number | null;
  seats_taken: number;
  is_open: boolean;
  venue_name: string | null;
}

export interface CcfEvent {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  location_note: string | null;
  organizer: string | null;
  capacity: number | null;
  seats_taken: number;
  requires_registration: boolean;
  price_cents: number;
  currency: string;
  requirements: string | null;
  community_slug: string | null;
}

export interface Court {
  id: string;
  name: string;
  sport: string;
  is_active: boolean;
}

export interface Facility {
  id: string;
  slug: string;
  name: string;
  kind: FacilityKind;
  description: string | null;
  capacity: number | null;
  floor_area_sqm: number | null;
  amenities: string[];
  layouts: string[];
  rules: string | null;
  accessibility: string | null;
  hero_image_url: string | null;
  gallery: string[];
  is_reservable: boolean;
  requires_approval: boolean;
  hourly_rate_cents: number | null;
  currency: string;
  open_time: string;
  close_time: string;
  courts: Court[];
}

export interface Reservation {
  id: string;
  facility_slug: string | null;
  facility_name: string | null;
  court_id: string | null;
  court_name: string | null;
  activity_name: string | null;
  starts_at: string;
  ends_at: string;
  status: ReservationStatus;
  participants: number;
  total_cents: number;
}

export interface VolunteerRole {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  commitment: string | null;
  requirements: string | null;
  schedule_note: string | null;
  training_note: string | null;
  is_open: boolean;
  ministry: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  level: AnnouncementLevel;
  is_sitewide: boolean;
  starts_at: string;
  ends_at: string | null;
  link_href: string | null;
  link_label: string | null;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface ResourceItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: string | null;
  url: string | null;
}

export interface ReservationAddon {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  price_cents: number;
}

/** A single bookable window on a court, as the availability grid sees it. */
export interface Slot {
  start: string;
  end: string;
  state: "available" | "reserved" | "pending" | "unavailable";
}

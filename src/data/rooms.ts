/**
 * The rooms at CCF Centris and how many people each seats per setup, as the
 * center gave them on 2026-09-01. This is the source for the homepage floor
 * guide. The facility pages under /centris still read older placeholder
 * figures from center.ts; reconcile the two when rooms move into the database.
 */

export interface RoomCapacity {
  /** Rows of chairs facing the front. */
  class?: number;
  /** Groups seated around tables. */
  table?: number;
  /** The room's own lounge furniture. */
  furniture?: number;
}

export interface Room {
  slug: string;
  name: string;
  blurb: string;
  capacity: RoomCapacity;
  /** A facility page with more detail, where one exists. */
  href?: string;
}

export const ROOMS: Room[] = [
  {
    slug: "welcome-center",
    name: "Welcome Center",
    blurb: "The first stop for guests, and open for Dgroups through the week.",
    capacity: { class: 80, table: 68, furniture: 66 },
    href: "/centris/facilities/welcome-center",
  },
  {
    slug: "mph-1",
    name: "MPH 1",
    blurb: "Multipurpose hall for classes, trainings, and gatherings.",
    capacity: { class: 90, table: 54 },
    href: "/centris/facilities/multipurpose-hall-1",
  },
  {
    slug: "mph-2",
    name: "MPH 2",
    blurb: "Multipurpose hall for classes, trainings, and gatherings.",
    capacity: { class: 80, table: 54 },
    href: "/centris/facilities/multipurpose-hall-2",
  },
  {
    slug: "mph-3",
    name: "MPH 3",
    blurb: "Multipurpose hall for classes, trainings, and gatherings.",
    capacity: { class: 90, table: 60 },
    href: "/centris/facilities/multipurpose-hall-3",
  },
  {
    slug: "mph-4",
    name: "MPH 4",
    blurb: "Multipurpose hall for classes, trainings, and gatherings.",
    capacity: { class: 56, table: 36 },
    href: "/centris/facilities/multipurpose-hall-4",
  },
  {
    slug: "toddlers-room",
    name: "Toddler’s Room",
    blurb: "A room for the youngest children, also set up for classes.",
    capacity: { class: 80, table: 60 },
  },
  {
    slug: "dgroup-lounge",
    name: "Dgroup Lounge",
    blurb: "Made for Dgroups meeting through the week.",
    capacity: { class: 54, table: 36, furniture: 42 },
    href: "/centris/facilities/dgroup-lounge",
  },
  {
    slug: "sports-court",
    name: "Sports court",
    blurb: "One basketball court that converts into pickleball courts.",
    capacity: {},
  },
];

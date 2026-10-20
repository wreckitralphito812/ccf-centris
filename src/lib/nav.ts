export interface NavItem {
  label: string;
  href: string;
  blurb?: string;
}

export interface NavGroup {
  label: string;
  href: string;
  items: NavItem[];
}

/**
 * The full navigation. Every href here resolves to a real page.
 *
 * Seven tabs, set by CCF Centris leadership: Visit (come in person), Watch
 * (last Sunday's message and its 4Ws), Connect (socials, Dgroup and volunteer
 * sign-up), Prayer Wall, What's Happening (events and the calendar), Reserve
 * (book a space at the center), and Contact. The center overview that was its
 * own Centris tab now lives on the homepage.
 *
 * A group with no items renders as a plain link, with no dropdown panel.
 */
export const NAV: NavGroup[] = [
  {
    label: "Visit",
    href: "/visit",
    items: [],
  },
  { label: "Watch", href: "/watch", items: [] },
  { label: "Connect", href: "/connect", items: [] },
  { label: "Prayer Wall", href: "/prayer-wall", items: [] },
  {
    label: "What\u2019s Happening",
    href: "/events",
    items: [
      { label: "Events & happenings", href: "/events", blurb: "What\u2019s coming up at Centris" },
      { label: "Calendar", href: "/events/calendar", blurb: "The month at a glance" },
    ],
  },
  { label: "Reserve", href: "/reserve", items: [] },
  // Its own tab (Ralph, 2026-10-10): CCF's giving form, on /give.
  { label: "Give", href: "/give", items: [] },
  { label: "Contact", href: "/contact", items: [] },
];

/** What an admin nav item counts, shown as a badge when something is waiting. */
export type AdminCount = "rooms" | "dgroups" | "announcements" | "prayer";

/**
 * The admin menu (Ralph, 2026-10-14): only the pages that work on real data,
 * named for what staff do, with a count on anything waiting for them. The
 * template's sample pages (services, messages, communities, volunteers, users,
 * sports, facilities, pastoral care) were taken out; next.config.ts sends
 * their old addresses to the dashboard.
 */
export const ADMIN_NAV: { section: string; items: (NavItem & { count?: AdminCount })[] }[] = [
  {
    section: "Start here",
    items: [{ label: "Home", href: "/admin" }],
  },
  {
    section: "Waiting for you",
    items: [
      { label: "Room requests", href: "/admin/reservations", count: "rooms" },
      { label: "New Dgroups", href: "/admin/dgroups", count: "dgroups" },
      { label: "Announcements", href: "/admin/announcements", count: "announcements" },
      { label: "Prayer Wall", href: "/admin/prayer", count: "prayer" },
    ],
  },
  {
    section: "Schedule",
    items: [
      { label: "Today", href: "/admin/today" },
      { label: "This week", href: "/admin/week" },
      { label: "Room calendar", href: "/admin/rooms" },
    ],
  },
  {
    section: "Bookings",
    items: [
      { label: "Dgroup tables", href: "/admin/dgroup-tables" },
      { label: "Court rentals", href: "/admin/courts" },
      { label: "Find a booking", href: "/admin/bookings" },
      { label: "Close a room or table", href: "/admin/blocks" },
    ],
  },
  {
    section: "On the site",
    items: [
      { label: "Events", href: "/admin/events" },
      { label: "Sunday video", href: "/admin/watch" },
      { label: "Site numbers", href: "/admin/analytics" },
    ],
  },
];


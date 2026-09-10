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
    items: [
      { label: "New here", href: "/visit/new-here", blurb: "What to expect your first Sunday" },
      { label: "Service times", href: "/visit/service-times", blurb: "Our weekly schedule" },
      { label: "Getting here & parking", href: "/visit/directions", blurb: "Directions and parking" },
      { label: "Coming with kids", href: "/visit/families", blurb: "Check-in and childcare" },
      { label: "Common questions", href: "/visit/faqs", blurb: "Answers for first-time guests" },
    ],
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
  { label: "Contact", href: "/contact", items: [] },
];

export const ADMIN_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    section: "Sunday",
    items: [
      { label: "Services", href: "/admin/services" },
      { label: "Messages", href: "/admin/messages" },
      { label: "4Ws", href: "/admin/4ws" },
    ],
  },
  {
    section: "People",
    items: [
      { label: "Dgroups", href: "/admin/dgroups" },
      { label: "Communities", href: "/admin/communities" },
      { label: "GLC", href: "/admin/glc" },
      { label: "Volunteers", href: "/admin/volunteers" },
      { label: "Users", href: "/admin/users" },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Events", href: "/admin/events" },
      { label: "Facilities", href: "/admin/facilities" },
      { label: "Reservations", href: "/admin/reservations" },
      { label: "Sports", href: "/admin/sports" },
    ],
  },
  {
    section: "Care",
    items: [
      { label: "Prayer requests", href: "/admin/prayer" },
      { label: "Pastoral requests", href: "/admin/pastoral" },
    ],
  },
  {
    section: "Site",
    items: [
      { label: "Announcements", href: "/admin/announcements" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

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
 * Four doors, chosen for a first-time visitor: Visit (come in person),
 * Watch (join online), Get Involved (everything after your first Sunday —
 * Dgroups, communities, growing, serving), and Centris (this building and
 * what happens in it). Communities, Serve, and Events used to be top-level
 * and are now grouped where a newcomer would actually look for them.
 */
export const NAV: NavGroup[] = [
  {
    label: "Visit",
    href: "/visit",
    items: [
      { label: "New here", href: "/visit/new-here", blurb: "What your first Sunday is like" },
      { label: "Service times", href: "/visit/service-times", blurb: "When we gather each week" },
      { label: "Getting here & parking", href: "/visit/directions", blurb: "By MRT, car, or ride" },
      { label: "Coming with kids", href: "/visit/families", blurb: "Check-in and what to expect" },
      { label: "Common questions", href: "/visit/faqs", blurb: "The practical things people ask" },
    ],
  },
  {
    label: "Watch",
    href: "/watch",
    items: [
      { label: "Watch live", href: "/watch/live", blurb: "Join the Sunday service online" },
      { label: "Latest message", href: "/watch/latest", blurb: "This week's teaching" },
      { label: "Messages & series", href: "/watch/messages", blurb: "Browse everything we've taught" },
      { label: "4Ws guides", href: "/watch/4ws", blurb: "For your Dgroup discussion" },
    ],
  },
  {
    label: "Get Involved",
    href: "/grow",
    items: [
      { label: "Find a Dgroup", href: "/grow/find-a-dgroup", blurb: "Search by day and life stage" },
      { label: "How Dgroups work", href: "/grow/join-a-dgroup", blurb: "What to expect in a group" },
      { label: "NXTGEN", href: "/communities/nxtgen", blurb: "Children and their families" },
      { label: "Elevate", href: "/communities/elevate", blurb: "Students and youth" },
      { label: "B1G", href: "/communities/b1g", blurb: "Single adults" },
      { label: "Women", href: "/communities/women", blurb: "Women of every season" },
      { label: "Men", href: "/communities/men", blurb: "Men growing together" },
      { label: "Sports", href: "/communities/sports", blurb: "Play, and belong" },
      { label: "Discipleship journey", href: "/grow/journey", blurb: "The path from your first step" },
      { label: "GLC classes", href: "/grow/glc", blurb: "Go deeper in the Word" },
      { label: "Know Jesus", href: "/know-jesus", blurb: "Where following Him begins" },
      { label: "Serve & volunteer", href: "/serve", blurb: "Find a place on a team" },
      { label: "Missions", href: "/serve/missions", blurb: "Beyond Quezon City" },
    ],
  },
  {
    label: "Centris",
    href: "/centris",
    items: [
      { label: "Explore the center", href: "/centris", blurb: "A look around the floor" },
      { label: "Facilities", href: "/centris/facilities", blurb: "Every space and what it seats" },
      { label: "Play sports", href: "/centris/sports", blurb: "Basketball, badminton, pickleball" },
      { label: "Court availability", href: "/centris/availability", blurb: "What's open right now" },
      { label: "Reserve a space", href: "/centris/reserve", blurb: "Book a court or a room" },
      { label: "Upcoming events", href: "/events", blurb: "What's on at Centris" },
    ],
  },
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

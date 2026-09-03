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
      { label: "New here", href: "/visit/new-here", blurb: "What to expect your first Sunday" },
      { label: "Service times", href: "/visit/service-times", blurb: "Our weekly schedule" },
      { label: "Getting here & parking", href: "/visit/directions", blurb: "Directions and parking" },
      { label: "Coming with kids", href: "/visit/families", blurb: "Check-in and childcare" },
      { label: "Common questions", href: "/visit/faqs", blurb: "Answers for first-time guests" },
    ],
  },
  {
    label: "Watch",
    href: "/watch",
    items: [
      { label: "Watch live", href: "/watch/live", blurb: "The Sunday service online" },
      { label: "Latest message", href: "/watch/latest", blurb: "This week's teaching" },
      { label: "Messages & series", href: "/watch/messages", blurb: "The full teaching archive" },
      { label: "4Ws guides", href: "/watch/4ws", blurb: "Discussion guides for Dgroups" },
    ],
  },
  {
    label: "Get Involved",
    href: "/grow",
    items: [
      { label: "Find a Dgroup", href: "/grow/find-a-dgroup", blurb: "Search by day and life stage" },
      { label: "How Dgroups work", href: "/grow/join-a-dgroup", blurb: "What a group involves" },
      { label: "NXTGEN", href: "/communities/nxtgen", blurb: "Children and their families" },
      { label: "Elevate", href: "/communities/elevate", blurb: "Students and youth" },
      { label: "B1G", href: "/communities/b1g", blurb: "Single adults" },
      { label: "Women", href: "/communities/women", blurb: "Women of every season" },
      { label: "Men", href: "/communities/men", blurb: "Men growing together" },
      { label: "Sports", href: "/communities/sports", blurb: "Recreation and fellowship" },
      { label: "Discipleship journey", href: "/grow/journey", blurb: "Steps toward maturity" },
      { label: "Resources", href: "/grow/resources", blurb: "CCF's growth materials" },
      { label: "52-Week Scripture", href: "/grow/resources/scripture-memory", blurb: "This week's memory verse" },
      { label: "Chronicle", href: "/grow/resources/chronicle", blurb: "The weekly message digest" },
      { label: "Intercede", href: "/intercede", blurb: "Prayer & Fasting weeks" },
      { label: "GLC classes", href: "/grow/glc", blurb: "Deeper study of the Word" },
      { label: "Know Jesus", href: "/know-jesus", blurb: "Beginning to follow Him" },
      { label: "Serve & volunteer", href: "/serve", blurb: "Join a ministry team" },
      { label: "Missions", href: "/serve/missions", blurb: "Outreach beyond Quezon City" },
    ],
  },
  {
    label: "Centris",
    href: "/centris",
    items: [
      { label: "Explore the center", href: "/centris", blurb: "An overview of the facility" },
      { label: "Facilities", href: "/centris/facilities", blurb: "Spaces and capacities" },
      { label: "Play sports", href: "/centris/sports", blurb: "Basketball, badminton, pickleball" },
      { label: "Court availability", href: "/centris/availability", blurb: "Current openings" },
      { label: "Reserve a space", href: "/centris/reserve", blurb: "Book a court or room" },
      { label: "Upcoming events", href: "/events", blurb: "What's scheduled at Centris" },
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

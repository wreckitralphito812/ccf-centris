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

/** The full navigation. Every href here resolves to a real page. */
export const NAV: NavGroup[] = [
  {
    label: "Visit",
    href: "/visit",
    items: [
      { label: "New here", href: "/visit/new-here", blurb: "Start here if it's your first Sunday" },
      { label: "Service times", href: "/visit/service-times", blurb: "When we gather" },
      { label: "Plan your visit", href: "/visit/plan", blurb: "Tell us you're coming" },
      { label: "Directions", href: "/visit/directions", blurb: "MRT, driving, parking" },
      { label: "Families", href: "/visit/families", blurb: "Coming with kids" },
      { label: "NXTGEN", href: "/communities/nxtgen", blurb: "Kids and families" },
      { label: "FAQs", href: "/visit/faqs", blurb: "The practical questions" },
    ],
  },
  {
    label: "Watch",
    href: "/watch",
    items: [
      { label: "Watch live", href: "/watch/live", blurb: "Sunday, as it happens" },
      { label: "Latest message", href: "/watch/latest", blurb: "This week's teaching" },
      { label: "All messages", href: "/watch/messages", blurb: "Search every message" },
      { label: "Sunday archive", href: "/watch/archive", blurb: "Every series CCF has taught" },
      { label: "Series", href: "/watch/series", blurb: "Teaching in sequence" },
      { label: "Speakers", href: "/watch/speakers", blurb: "Who teaches at Centris" },
      { label: "4Ws", href: "/watch/4ws", blurb: "Dgroup discussion guides" },
    ],
  },
  {
    label: "Grow",
    href: "/grow",
    items: [
      { label: "Join a Dgroup", href: "/grow/join-a-dgroup", blurb: "How Dgroups work" },
      { label: "Find a Dgroup", href: "/grow/find-a-dgroup", blurb: "Search by day and life stage" },
      { label: "Discipleship journey", href: "/grow/journey", blurb: "The path from here" },
      { label: "GLC", href: "/grow/glc", blurb: "Classes that go deeper" },
      { label: "Resources", href: "/grow/resources", blurb: "Guides and tools" },
      { label: "Know Jesus", href: "/know-jesus", blurb: "Where it starts" },
    ],
  },
  {
    label: "Communities",
    href: "/communities",
    items: [
      { label: "NXTGEN", href: "/communities/nxtgen", blurb: "Children and families" },
      { label: "Elevate", href: "/communities/elevate", blurb: "Students and youth" },
      { label: "B1G", href: "/communities/b1g", blurb: "Single adults" },
      { label: "Families", href: "/communities/families", blurb: "Marriage and parenting" },
      { label: "Women", href: "/communities/women", blurb: "Women's ministry" },
      { label: "Men", href: "/communities/men", blurb: "Men's ministry" },
      { label: "Sports", href: "/communities/sports", blurb: "Sports ministry" },
    ],
  },
  {
    label: "Events",
    href: "/events",
    items: [
      { label: "What's on", href: "/events", blurb: "Everything coming up" },
      { label: "Calendar", href: "/events/calendar", blurb: "Month at a glance" },
      { label: "Classes", href: "/events?category=Class", blurb: "Courses and workshops" },
      { label: "Retreats", href: "/events?category=Retreat", blurb: "Time away" },
      { label: "Community events", href: "/events?category=Outreach", blurb: "Beyond the center" },
    ],
  },
  {
    label: "Serve",
    href: "/serve",
    items: [
      { label: "Volunteer", href: "/serve", blurb: "Find your place" },
      { label: "Ministry opportunities", href: "/serve#roles", blurb: "Every open role" },
      { label: "Missions", href: "/serve/missions", blurb: "Beyond Quezon City" },
      { label: "Serve at Centris", href: "/serve/at-centris", blurb: "Teams at this center" },
    ],
  },
  {
    label: "Centris",
    href: "/centris",
    items: [
      { label: "Explore the center", href: "/centris", blurb: "What's on the floor" },
      { label: "Sports", href: "/centris/sports", blurb: "Play at Centris" },
      { label: "Facilities", href: "/centris/facilities", blurb: "Every space" },
      { label: "Court availability", href: "/centris/availability", blurb: "Open right now" },
      { label: "Reserve a space", href: "/centris/reserve", blurb: "Book a court or room" },
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

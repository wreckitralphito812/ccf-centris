import type {
  Announcement,
  CcfEvent,
  Dgroup,
  Faq,
  GlcClass,
  GlcProgram,
  ResourceItem,
  VolunteerRole,
} from "@/lib/types";

/** Representative community data. Replaced by CMS content before launch. */

export const dgroups: Dgroup[] = [
  {
    id: "dg-1", name: "Quezon Ave Young Pros", community_slug: "b1g",
    general_area: "Near Centris", audience: "young_professionals", mode: "in_person",
    language: "English", age_min: 23, age_max: 32, day_of_week: 3, start_time: "19:30",
    description: "Working adults in their twenties and early thirties. We meet after work, eat first, then open the 4Ws together.",
    seats_left: 3, leader_first_name: "Miguel", is_open: true,
  },
  {
    id: "dg-2", name: "Tuesday Morning Women", community_slug: "women",
    general_area: "Dgroup Lounge, Centris", audience: "women", mode: "in_person",
    language: "English", age_min: 30, age_max: null, day_of_week: 2, start_time: "09:30",
    description: "Mothers and working women who can meet while the kids are at school. Coffee, Scripture, and honest conversation.",
    seats_left: 5, leader_first_name: "Grace", is_open: true,
  },
  {
    id: "dg-3", name: "Centris Men's Breakfast", community_slug: "men",
    general_area: "Dgroup Lounge, Centris", audience: "men", mode: "in_person",
    language: "English", age_min: 28, age_max: null, day_of_week: 6, start_time: "07:00",
    description: "Early Saturday. We eat, we read, and we ask each other the questions nobody else is asking.",
    seats_left: 2, leader_first_name: "Dennis", is_open: true,
  },
  {
    id: "dg-4", name: "Elevate Senior High", community_slug: "elevate",
    general_area: "Multipurpose Hall 3, Centris", audience: "students", mode: "in_person",
    language: "English", age_min: 16, age_max: 18, day_of_week: 5, start_time: "18:00",
    description: "Grades 11 and 12. Meets right after Elevate night, same building.",
    seats_left: 6, leader_first_name: "Ronnel", is_open: true,
  },
  {
    id: "dg-5", name: "Elevate College", community_slug: "elevate",
    general_area: "Near UP and Ateneo", audience: "students", mode: "hybrid",
    language: "English", age_min: 18, age_max: 23, day_of_week: 4, start_time: "19:00",
    description: "College students from campuses around Quezon City. In person twice a month, online the rest.",
    seats_left: 4, leader_first_name: "Andrea", is_open: true,
  },
  {
    id: "dg-6", name: "Married and Learning", community_slug: "families",
    general_area: "Near Centris", audience: "couples", mode: "in_person",
    language: "English", age_min: 28, age_max: 45, day_of_week: 5, start_time: "19:30",
    description: "Couples in the first ten years of marriage. Kids welcome, we take turns watching them.",
    seats_left: 2, leader_first_name: "Paolo", is_open: true,
  },
  {
    id: "dg-7", name: "Tagalog Dgroup", community_slug: null,
    general_area: "Dgroup Lounge, Centris", audience: "mixed", mode: "in_person",
    language: "Tagalog", age_min: null, age_max: null, day_of_week: 0, start_time: "13:30",
    description: "Buong pamilya ay malugod na tinatanggap. Nagkikita kami tuwing Linggo pagkatapos ng ikalawang serbisyo.",
    seats_left: 8, leader_first_name: "Nestor", is_open: true,
  },
  {
    id: "dg-8", name: "Online Weeknight", community_slug: null,
    general_area: "Online", audience: "mixed", mode: "online",
    language: "English", age_min: 21, age_max: null, day_of_week: 1, start_time: "20:00",
    description: "For anyone whose commute makes an in-person group hard. Same 4Ws, video call.",
    seats_left: 7, leader_first_name: "Katrina", is_open: true,
  },
  {
    id: "dg-9", name: "Sports Ministry Dgroup", community_slug: "sports",
    general_area: "Sports Hall, Centris", audience: "mixed", mode: "in_person",
    language: "English", age_min: 18, age_max: null, day_of_week: 2, start_time: "20:30",
    description: "We play first, then sit down on the court and open the Word. Bring shoes.",
    seats_left: 5, leader_first_name: "Mark", is_open: true,
  },
  {
    id: "dg-10", name: "New Believers", community_slug: null,
    general_area: "Dgroup Lounge, Centris", audience: "mixed", mode: "in_person",
    language: "English", age_min: null, age_max: null, day_of_week: 0, start_time: "11:00",
    description: "If you are new to faith or just exploring, start here. No assumed background, every question welcome.",
    seats_left: 9, leader_first_name: "Joby", is_open: true,
  },
  {
    id: "dg-11", name: "Single Moms", community_slug: "families",
    general_area: "Near Centris", audience: "women", mode: "in_person",
    language: "English", age_min: 25, age_max: null, day_of_week: 6, start_time: "10:00",
    description: "A group for single mothers. Childcare provided during the meeting.",
    seats_left: 4, leader_first_name: "Lorna", is_open: true,
  },
  {
    id: "dg-12", name: "Seniors Fellowship", community_slug: null,
    general_area: "Multipurpose Hall 4, Centris", audience: "mixed", mode: "in_person",
    language: "Tagalog", age_min: 60, age_max: null, day_of_week: 4, start_time: "10:00",
    description: "Para sa mga nakatatanda. Mabagal ang tempo, malalim ang usapan.",
    seats_left: 6, leader_first_name: "Ernesto", is_open: true,
  },
];

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  // Manila wall clock to UTC instant.
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute) - 8 * 3600_000,
  ).toISOString();
}

/**
 * Events shown on What's Happening. Empty for launch on CCF Centris's request:
 * the sample events here were placeholders, and the site shouldn't advertise
 * gatherings that aren't happening. Add real ones here as they are announced.
 * `category` should be one of EVENT_CATEGORIES in src/lib/events.ts.
 */
export const events: CcfEvent[] = [];

export const glcPrograms: GlcProgram[] = [
  { id: "glc-1", slug: "glc-1", code: "GLC 1", title: "Knowing God", description: "The foundations. Who God is, what the gospel says, and how a person actually becomes a follower of Jesus.", level: 1 },
  { id: "glc-2", slug: "glc-2", code: "GLC 2", title: "Growing in Christ", description: "Prayer, Scripture, and the daily habits that make faith durable rather than seasonal.", level: 2 },
  { id: "glc-3", slug: "glc-3", code: "GLC 3", title: "Leading a Dgroup", description: "Practical training for anyone ready to open their home and lead a group of their own.", level: 3 },
  { id: "glc-4", slug: "glc-4", code: "GLC 4", title: "Making Disciples", description: "Multiplication. How to raise leaders who will raise leaders, and how CCF thinks about generations of Dgroups.", level: 4 },
];

export const glcClasses: GlcClass[] = [
  { id: "gc-1", program: glcPrograms[0], starts_on: iso(8, 19).slice(0, 10), ends_on: iso(50, 19).slice(0, 10), schedule_note: "Wednesdays, 7:00 to 9:00 PM, six weeks", capacity: 40, seats_taken: 26, is_open: true, venue_name: "Multipurpose Hall 2" },
  { id: "gc-2", program: glcPrograms[1], starts_on: iso(11, 19).slice(0, 10), ends_on: iso(53, 19).slice(0, 10), schedule_note: "Saturdays, 9:00 to 11:00 AM, six weeks", capacity: 40, seats_taken: 40, is_open: false, venue_name: "Multipurpose Hall 1" },
  { id: "gc-3", program: glcPrograms[2], starts_on: iso(19, 19).slice(0, 10), ends_on: iso(61, 19).slice(0, 10), schedule_note: "Tuesdays, 7:00 to 9:00 PM, eight weeks", capacity: 30, seats_taken: 12, is_open: true, venue_name: "Multipurpose Hall 3" },
  { id: "gc-4", program: glcPrograms[3], starts_on: iso(33, 19).slice(0, 10), ends_on: iso(75, 19).slice(0, 10), schedule_note: "Thursdays, 7:00 to 9:00 PM, eight weeks", capacity: 24, seats_taken: 5, is_open: true, venue_name: "Multipurpose Hall 4" },
];

export const volunteerRoles: VolunteerRole[] = [
  { id: "vr-1", slug: "welcome-team", title: "Welcome Team", description: "You are the first person a guest meets. Open doors, answer questions, walk people to where they are going.", commitment: "Two Sundays a month, arrive 45 minutes early", requirements: "Warm with strangers. No experience needed.", schedule_note: "Sundays", training_note: "One orientation session before your first Sunday.", is_open: true, ministry: "Welcome" },
  { id: "vr-2", slug: "ushers", title: "Ushers", description: "Seat people, manage the flow in and out of the hall, and help anyone who needs assistance finding a seat.", commitment: "Two Sundays a month", requirements: "Comfortable on your feet for a full service.", schedule_note: "Sundays", training_note: "Shadow an experienced usher for one service.", is_open: true, ministry: "Welcome" },
  { id: "vr-3", slug: "nxtgen-teacher", title: "NXTGEN Teacher", description: "Teach a room of kids the same message the adults are hearing, in a way they will remember.", commitment: "Two Sundays a month", requirements: "Background check and child safety training required before serving.", schedule_note: "Sundays, both services", training_note: "Child safety training plus curriculum walkthrough.", is_open: true, ministry: "NXTGEN" },
  { id: "vr-4", slug: "nxtgen-checkin", title: "NXTGEN Check-in", description: "Run the check-in desk, match children to guardians at pickup, and keep the room count accurate.", commitment: "Two Sundays a month", requirements: "Background check required. Careful with detail.", schedule_note: "Sundays", training_note: "Check-in system training, one session.", is_open: true, ministry: "NXTGEN" },
  { id: "vr-5", slug: "worship-band", title: "Worship Team", description: "Play or sing on the Sunday team. Rehearsal Thursday, service Sunday.", commitment: "Weekly rehearsal plus assigned Sundays", requirements: "Audition. Able to read a chart or learn by ear.", schedule_note: "Thursdays and Sundays", training_note: "Audition then a rehearsal cycle before your first service.", is_open: true, ministry: "Worship" },
  { id: "vr-6", slug: "production", title: "Production", description: "Sound, lighting, slides, and the livestream.", commitment: "Two Sundays a month", requirements: "Willing to learn. Technical background helps but is not required.", schedule_note: "Sundays", training_note: "Paired with a lead operator for four services.", is_open: true, ministry: "Production" },
  { id: "vr-7", slug: "photography", title: "Photography", description: "Capture the life of the center for the website and social. Kids only with guardian consent on file.", commitment: "Flexible, roughly monthly", requirements: "Own camera preferred. Portfolio not required.", schedule_note: "Events and Sundays", training_note: "Briefing on consent and child privacy policy.", is_open: true, ministry: "Communications" },
  { id: "vr-8", slug: "sports-ministry", title: "Sports Ministry Volunteer", description: "Run open play, coach a clinic, or manage a league night in the Sports Hall.", commitment: "One or two weeknights a month", requirements: "Know the sport well enough to referee.", schedule_note: "Weeknights and Saturdays", training_note: "Orientation on how we run play as ministry.", is_open: true, ministry: "Sports" },
  { id: "vr-9", slug: "prayer-team", title: "Prayer Team", description: "Pray with people at the front after services, and with those who submit requests online.", commitment: "Two Sundays a month", requirements: "Confidentiality is absolute. Interview required.", schedule_note: "Sundays", training_note: "Pastoral care training, two sessions.", is_open: true, ministry: "Prayer" },
  { id: "vr-10", slug: "events-team", title: "Events Team", description: "Set up, run, and pack down the gatherings that fill the calendar.", commitment: "Varies by event", requirements: "Able to lift and carry. Reliable with call times.", schedule_note: "Event-based", training_note: "Briefed per event.", is_open: true, ministry: "Events" },
  { id: "vr-11", slug: "facilities", title: "Facilities", description: "Keep the center running: setup, resets between services, and general care of the space.", commitment: "Two Sundays a month or weeknights", requirements: "None.", schedule_note: "Flexible", training_note: "Walkthrough of the center and equipment.", is_open: true, ministry: "Facilities" },
  { id: "vr-12", slug: "elevate-leader", title: "Elevate Small Group Leader", description: "Lead a Dgroup of students through the school year.", commitment: "Friday nights plus your group", requirements: "Background check. Committed to a full school year.", schedule_note: "Fridays", training_note: "GLC 3 recommended, plus Elevate leader training.", is_open: true, ministry: "Elevate" },
];

export const faqs: Faq[] = [
  { id: "f-1", category: "visit", question: "What should I wear?", answer: "Whatever you are comfortable in. You will see people in shorts and people in barongs on the same Sunday. Nobody is checking." },
  { id: "f-2", category: "visit", question: "Do I need to register before coming?", answer: "No. Registration is optional and only exists so we can have someone ready to meet you. Walk in any Sunday without telling us first." },
  { id: "f-3", category: "visit", question: "Can anyone attend?", answer: "Yes. You do not need to be a member, a Christian, or invited by anyone. You are welcome to leave with as many questions as you arrived with if you like." },
  { id: "f-4", category: "visit", question: "How long is a worship service?", answer: "About 90 minutes, including worship and the message." },
  { id: "f-5", category: "visit", question: "Can I bring my children?", answer: "Please do. NXTGEN runs alongside both Sunday services with age-appropriate rooms, or your kids are welcome to stay with you in the main hall." },
  { id: "f-6", category: "visit", question: "Where is NXTGEN?", answer: "On the same floor as the Main Worship Hall. Check-in opens 30 minutes before each service and the team at the Welcome Center will walk you there." },
  { id: "f-7", category: "access", question: "Is the center wheelchair accessible?", answer: "Yes. The center is step-free from the Centris Station concourse, with lift access, accessible washrooms on the same floor, and accessible seating bays with companion seats in the Main Worship Hall." },
  { id: "f-8", category: "visit", question: "Is parking available?", answer: "Eton Centris has parking on site. Rates and the closest entrance to the 2/F center are posted on the Directions page, and our team updates them as mall arrangements change." },
  { id: "f-9", category: "grow", question: "How do I join a Dgroup?", answer: "Use the Dgroup finder to filter by day, life stage, and location, then send an interest note. A member of the Dgroup team replies within a few days. You are never added to a group without a conversation first." },
  { id: "f-10", category: "visit", question: "Who can I talk to after the service?", answer: "The prayer team stays at the front, and the Welcome Center is staffed for 30 minutes after each service. If you would rather not talk in person, use the prayer request form and it goes straight to the pastoral team." },
  { id: "f-11", category: "play", question: "Do I need to be a CCF member to book a court?", answer: "No. The Sports Hall is open to the community. Some ministry programs and leagues have their own requirements, which are listed on each event." },
  { id: "f-12", category: "play", question: "What do I need to bring to play?", answer: "Non-marking indoor shoes are required on the sport floor. Paddles, rackets, and balls can be rented at the desk if you do not have your own." },
];

export const resources: ResourceItem[] = [
  { id: "res-1", slug: "4ws-guide", title: "How to run a 4Ws", description: "The one-page guide every CCF Dgroup leader starts with. Welcome, Worship, Word, Works.", kind: "Guide", url: null },
  { id: "res-2", slug: "reading-plan", title: "One-year Bible reading plan", description: "A daily plan you can start on any date, with catch-up days built in.", kind: "Plan", url: null },
  { id: "res-3", slug: "new-believer", title: "First steps for new believers", description: "What to do in the first month after deciding to follow Jesus.", kind: "Guide", url: null },
  { id: "res-4", slug: "prayer-journal", title: "Prayer journal template", description: "A simple printable for tracking what you are asking and what has been answered.", kind: "Printable", url: null },
  { id: "res-5", slug: "dgroup-covenant", title: "Dgroup covenant template", description: "How a new group agrees on confidentiality, attendance, and what it is for.", kind: "Template", url: null },
  { id: "res-6", slug: "parenting-toolkit", title: "Family devotion toolkit", description: "Short devotions built for households with young children and no spare time.", kind: "Toolkit", url: null },
];

export const announcements: Announcement[] = [
  {
    id: "ann-1",
    title: "Centris is open",
    body: "CCF Centris opened in August 2026 alongside CCF's 42nd anniversary. Come see the new center.",
    level: "info",
    is_sitewide: true,
    starts_at: new Date(Date.now() - 86_400_000).toISOString(),
    ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    link_href: "/visit/new-here",
    link_label: "Plan your first visit",
  },
];

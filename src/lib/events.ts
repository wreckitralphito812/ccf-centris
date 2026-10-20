/**
 * The categories on What's Happening that always have a place on the page,
 * even before anything is announced in them. Other categories appear only once
 * they hold events.
 *
 * The categories ministries post announcements under (Ralph, 2026-10-05):
 * church-wide events, and trainings and classes. Sports joined them, listed
 * under trainings and classes (Adrian, 2026-10-20). The page shows them in
 * this order.
 */
export const EVENT_CATEGORIES = [
  {
    name: "Events",
    blurb: "Camps, retreats, conferences and gatherings for everyone.",
    empty: "Nothing announced yet. Camps, retreats and conferences will be posted here first.",
  },
  {
    name: "Trainings and classes",
    blurb: "Equipping classes, ministry trainings and workshops.",
    empty: "Nothing announced yet. Trainings and classes will be posted here.",
  },
  {
    name: "Sports",
    blurb: "Open play, leagues and other sports activities.",
    empty: "Nothing announced yet. Sports activities will be posted here.",
  },
] as const;

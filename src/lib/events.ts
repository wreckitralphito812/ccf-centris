/**
 * The categories on What's Happening that always have a place on the page,
 * even before anything is announced in them. Other categories appear only once
 * they hold events.
 *
 * EVENTS is for the big ones: retreats and conferences.
 */
export const EVENT_CATEGORIES = [
  {
    name: "Events",
    blurb: "Our big gatherings, like retreats and conferences.",
    empty: "Nothing announced yet. Retreats and conferences will be posted here first.",
  },
] as const;

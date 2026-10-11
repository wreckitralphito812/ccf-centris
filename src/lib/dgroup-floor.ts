/**
 * Where everything stands in the two Dgroup rooms, traced from Adrian
 * Camacho's floor plans (DGROUP PLAN, 6360 × 7133 mm; WELCOME PLAN,
 * 6898 × 11691 mm). Positions are percentages of the room's inside walls, so
 * the drawing scales to any width.
 *
 * Used to draw the plan on the booking page and in the confirmation email,
 * with the leader's tables highlighted. Chairs are left out: at email size they
 * only add noise, and each table's box already covers its seating area.
 */

export interface FloorItem {
  /** The table number, or undefined for furniture that can't be booked. */
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: "rect" | "round" | "cluster";
}

export interface FloorPlan {
  /** Inside width ÷ inside height. */
  aspect: number;
  items: FloorItem[];
  /** Door openings along a wall, as a span of that wall in percent. */
  doors: { wall: "left" | "bottom"; from: number; to: number }[];
}

const cols = (x: number, w: number, labels: number[], rows: number[], h: number): FloorItem[] =>
  labels.map((l, i) => ({ label: String(l), x, y: rows[i], w, h, shape: "cluster" }));

const WELCOME_ROWS = [5.0, 20.4, 35.7, 51.1, 66.5, 81.8];

export const FLOOR_PLANS: Record<string, FloorPlan> = {
  "dgroup-lounge": {
    // Re-drawn 2026-10-11 from Ralph's sketch of the new arrangement: the big
    // tables 1 and 12 and squares 5 and 4 down the west side, benches 6 and 7
    // end to end along the south wall; down the east wall, 9 and 8 each with a
    // sofa, and the 2-seat tables 3 and 2.
    aspect: 685 / 775,
    items: [
      { label: "1", x: 8.0, y: 3.0, w: 52.0, h: 19.0, shape: "rect" },
      { label: "12", x: 8.0, y: 26.5, w: 52.0, h: 19.0, shape: "rect" },
      { label: "5", x: 9.0, y: 51.0, w: 22.0, h: 19.0, shape: "cluster" },
      { label: "4", x: 37.0, y: 51.0, w: 22.0, h: 19.0, shape: "cluster" },
      { label: "6", x: 6.0, y: 82.0, w: 29.0, h: 13.0, shape: "rect" },
      { label: "7", x: 35.0, y: 82.0, w: 29.0, h: 13.0, shape: "rect" },
      { label: "9", x: 71.0, y: 4.0, w: 14.0, h: 14.0, shape: "cluster" },
      { label: "3", x: 71.0, y: 25.0, w: 15.0, h: 11.0, shape: "round" },
      { label: "8", x: 71.0, y: 42.0, w: 14.0, h: 14.0, shape: "cluster" },
      { label: "2", x: 71.0, y: 63.0, w: 15.0, h: 11.0, shape: "round" },
      // The sofas beside 9 and 8.
      { x: 88.0, y: 2.0, w: 11.0, h: 18.0, shape: "rect" },
      { x: 88.0, y: 40.0, w: 11.0, h: 18.0, shape: "rect" },
    ],
    doors: [{ wall: "bottom", from: 84.4, to: 99.3 }],
  },
  "welcome-center": {
    aspect: 735 / 1262,
    items: [
      { label: "1", x: 4.9, y: 16.2, w: 27.6, h: 22.0, shape: "rect" },
      { label: "2", x: 4.9, y: 38.9, w: 27.6, h: 21.7, shape: "rect" },
      { label: "3", x: 4.9, y: 61.3, w: 27.6, h: 22.2, shape: "rect" },
      ...cols(41.6, 21.9, [4, 5, 6, 7, 8, 9], WELCOME_ROWS, 12.7),
      ...cols(69.1, 21.8, [10, 11, 12, 13, 14, 15], WELCOME_ROWS, 12.7),
      // Counters in the east corners.
      { x: 73.7, y: 0, w: 26.3, h: 2.9, shape: "rect" },
      { x: 73.7, y: 96.8, w: 26.3, h: 3.2, shape: "rect" },
    ],
    doors: [
      { wall: "left", from: 1.0, to: 10.5 },
      { wall: "left", from: 89.5, to: 99.0 },
    ],
  },
};

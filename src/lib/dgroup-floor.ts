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
    aspect: 685 / 775,
    items: [
      { label: "1", x: 14.0, y: 2.3, w: 44.8, h: 25.8, shape: "rect" },
      { label: "2", x: 14.9, y: 34.2, w: 23.3, h: 20.6, shape: "cluster" },
      { label: "3", x: 44.8, y: 34.2, w: 23.4, h: 20.6, shape: "cluster" },
      { label: "4", x: 14.9, y: 59.2, w: 23.3, h: 20.7, shape: "cluster" },
      { label: "5", x: 44.8, y: 59.2, w: 23.4, h: 20.7, shape: "cluster" },
      { label: "6", x: 10.7, y: 87.7, w: 28.3, h: 11.6, shape: "rect" },
      { label: "7", x: 39.0, y: 87.7, w: 28.2, h: 11.6, shape: "rect" },
      { label: "8", x: 76.9, y: 15.5, w: 9.5, h: 8.4, shape: "round" },
      { label: "9", x: 88.5, y: 15.5, w: 9.5, h: 8.4, shape: "round" },
      { label: "10", x: 76.9, y: 53.1, w: 9.5, h: 8.4, shape: "round" },
      { label: "11", x: 88.5, y: 53.1, w: 9.5, h: 8.4, shape: "round" },
      // Lounge seating.
      { x: 78.0, y: 0.6, w: 9.4, h: 10.5, shape: "rect" },
      { x: 90.5, y: 0.6, w: 9.0, h: 10.5, shape: "rect" },
      { x: 78.0, y: 28.0, w: 21.5, h: 20.8, shape: "rect" },
      { x: 78.0, y: 65.7, w: 9.4, h: 10.4, shape: "rect" },
      { x: 90.5, y: 65.7, w: 9.0, h: 10.4, shape: "rect" },
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

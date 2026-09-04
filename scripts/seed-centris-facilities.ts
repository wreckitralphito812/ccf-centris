/**
 * Seed the CCF Centris satellite, facilities, courts, and reservation add-ons
 * into Supabase from the canonical catalogue in `src/data/center.ts`.
 *
 *   npm run seed:facilities            # upsert every row
 *   npm run seed:facilities -- --dry   # print what would change, write nothing
 *
 * Idempotent: row ids are derived deterministically from the catalogue slugs,
 * so re-running updates in place rather than duplicating. Safe to run on every
 * deploy. Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from the
 * environment, falling back to a local .env.local for developer runs).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { facilities, addons } from "../src/data/center";

// --- env -------------------------------------------------------------------

/** tsx loads .env but not .env.local; pull it in for local runs without a dep. */
function loadLocalEnv() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!(k in process.env)) process.env[k] = v.replace(/^["']|["']$/g, "");
  }
}
loadLocalEnv();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "seed:facilities needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const DRY = process.argv.includes("--dry");

// --- ids -----------------------------------------------------------------

/** The one satellite. Matches the fallback in src/lib/supabase/server.ts. */
const SATELLITE_ID =
  process.env.CENTRIS_SATELLITE_ID ?? "00000000-0000-0000-0000-0000000ce471";

/** A stable v5-shaped UUID from a namespace + key. Same input, same id, forever. */
function uuidFor(key: string): string {
  const h = createHash("sha1").update(`ccf-centris:${key}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    `8${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join("-");
}

const facilityId = (slug: string) => uuidFor(`facility:${slug}`);
const courtId = (facilitySlug: string, localId: string) =>
  uuidFor(`court:${facilitySlug}:${localId}`);

// --- rows --------------------------------------------------------------

const satelliteRow = {
  id: SATELLITE_ID,
  slug: "centris",
  name: "CCF Centris",
  short_name: "Centris",
  address_lines: ["EDSA cor. Quezon Avenue", "Quezon City"],
  city: "Quezon City",
  timezone: "Asia/Manila",
  is_active: true,
};

const facilityRows = facilities.map((f, i) => ({
  id: facilityId(f.slug),
  satellite_id: SATELLITE_ID,
  slug: f.slug,
  name: f.name,
  kind: f.kind,
  description: f.description,
  capacity: f.capacity,
  floor_area_sqm: f.floor_area_sqm,
  amenities: f.amenities,
  layouts: f.layouts,
  rules: f.rules,
  accessibility: f.accessibility,
  hero_image_url: f.hero_image_url,
  gallery: f.gallery,
  is_reservable: f.is_reservable,
  requires_approval: f.requires_approval,
  hourly_rate_cents: f.hourly_rate_cents,
  currency: f.currency,
  open_time: f.open_time,
  close_time: f.close_time,
  sort_order: i,
}));

const courtRows = facilities.flatMap((f) =>
  f.courts.map((c, i) => ({
    id: courtId(f.slug, c.id),
    facility_id: facilityId(f.slug),
    name: c.name,
    sport: c.sport,
    is_active: c.is_active,
    sort_order: i,
  })),
);

const addonRows = addons.map((a) => ({
  id: uuidFor(`addon:${a.slug}`),
  satellite_id: SATELLITE_ID,
  slug: a.slug,
  name: a.name,
  unit: a.unit,
  price_cents: a.price_cents,
  is_active: true,
}));

// --- run ---------------------------------------------------------------

async function main() {
  const db = createClient(URL!, KEY!, { auth: { persistSession: false } });

  console.log(
    `${DRY ? "[dry] " : ""}seeding 1 satellite, ${facilityRows.length} facilities, ` +
      `${courtRows.length} courts, ${addonRows.length} add-ons`,
  );

  if (DRY) {
    console.log(JSON.stringify({ satelliteRow, facilityRows, courtRows, addonRows }, null, 2));
    return;
  }

  const steps: [string, () => PromiseLike<{ error: unknown }>][] = [
    ["satellites", () => db.from("satellites").upsert(satelliteRow, { onConflict: "id" })],
    ["facilities", () => db.from("facilities").upsert(facilityRows, { onConflict: "id" })],
    ["courts", () => db.from("courts").upsert(courtRows, { onConflict: "id" })],
    ["reservation_addons", () => db.from("reservation_addons").upsert(addonRows, { onConflict: "id" })],
  ];

  for (const [name, run] of steps) {
    const { error } = await run();
    if (error) {
      console.error(`  ${name}: FAILED`, error);
      process.exit(1);
    }
    console.log(`  ${name}: ok`);
  }

  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

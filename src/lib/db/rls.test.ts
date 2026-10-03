import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test, { before } from "node:test";

import { PGlite, type Transaction } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Runs every migration in supabase/migrations against an in-memory Postgres
 * (PGlite), behind a thin stand-in for what Supabase provides: the auth
 * schema, auth.uid(), and the anon / authenticated / service_role roles with
 * Supabase's default grants. Then checks the security rules by acting as
 * specific members. Writes made "as the server" run as the database owner,
 * which bypasses row-level security the way the service role does.
 *
 * Members sign in with Firebase now and the site talks to Postgres with the
 * service role, so the member policies below no longer decide what the site
 * shows. They are still tested because they are what stands between the data
 * and anyone holding the anon key.
 */

const MIGRATIONS = join(__dirname, "..", "..", "..", "supabase", "migrations");

const SUPABASE_STANDIN = `
create schema if not exists extensions;
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public, extensions, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const SAT = "00000000-0000-0000-0000-0000000ce471";
const ANA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const MOD = "33333333-3333-4333-8333-333333333333";
const CAL = "44444444-4444-4444-8444-444444444444"; // no screen name
const DAN = "55555555-5555-4555-8555-555555555555";

let db: PGlite;

before(async () => {
  db = new PGlite({ extensions: { btree_gist, pgcrypto } });
  await db.exec(SUPABASE_STANDIN);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  await db.exec(`
    insert into satellites (id, slug, name) values ('${SAT}', 'centris', 'CCF Centris');
    insert into profiles (id, email) values
      ('${ANA}', 'ana@example.com'), ('${BEN}', 'ben@example.com'),
      ('${MOD}', 'mod@example.com'), ('${CAL}', 'cal@example.com'),
      ('${DAN}', 'dan@example.com');
    update profiles set screen_name = 'Ana' where id = '${ANA}';
    update profiles set screen_name = 'Ben' where id = '${BEN}';
    update profiles set screen_name = 'Mod' where id = '${MOD}';
    update profiles set screen_name = 'Dan' where id = '${DAN}';
    insert into user_roles (user_id, satellite_id, role) values ('${MOD}', '${SAT}', 'prayer_team');
  `);
});

/** Run SQL as a signed-in member, or as a signed-out visitor when `who` is null. */
async function as<T = Record<string, unknown>>(
  who: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return db.transaction(async (tx: Transaction) => {
    await tx.exec(`set local role ${who ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [who ?? ""]);
    return (await tx.query<T>(sql, params)).rows;
  });
}

async function post(author: string, body = "Please pray for my exam.") {
  const [row] = await as<{ id: string }>(
    author,
    "insert into prayer_wall_posts (satellite_id, author_id, body) values ($1, $2, $3) returning id",
    [SAT, author, body],
  );
  return row.id;
}

const visible = async (who: string, id: string) =>
  (await as(who, "select id from prayer_wall_posts where id = $1", [id])).length === 1;

// --- Prayer Wall ----------------------------------------------------------------

test("signed-out visitors can't read the prayer wall at all", async () => {
  await post(ANA);
  await assert.rejects(as(null, "select * from prayer_wall_posts"), /permission denied/);
});

test("a post carries the author's screen name and a two-month expiry, whatever the client sends", async () => {
  const [row] = await as<{ author_name: string; two_months: boolean; hidden_at: string | null }>(
    ANA,
    `insert into prayer_wall_posts (satellite_id, author_id, body, author_name, expires_at, hidden_at)
     values ($1, $2, 'Healing for my dad', 'Pastor Ana', '2099-01-01', now())
     returning author_name, expires_at = created_at + interval '2 months' as two_months, hidden_at`,
    [SAT, ANA],
  );
  assert.equal(row.author_name, "Ana");
  assert.equal(row.two_months, true);
  assert.equal(row.hidden_at, null);
});

test("members can't post as someone else", async () => {
  await assert.rejects(
    as(BEN, "insert into prayer_wall_posts (satellite_id, author_id, body) values ($1, $2, 'x')", [SAT, ANA]),
    /row-level security/,
  );
});

test("members without a screen name can't post", async () => {
  await assert.rejects(
    as(CAL, "insert into prayer_wall_posts (satellite_id, author_id, body) values ($1, $2, 'x')", [SAT, CAL]),
    /screen name/,
  );
});

test("members can't edit a request after posting", async () => {
  const id = await post(ANA);
  await assert.rejects(
    as(ANA, "update prayer_wall_posts set body = 'changed' where id = $1", [id]),
    /permission denied/,
  );
});

test("only moderators can hide; hidden requests leave members' view but not the author's", async () => {
  const id = await post(ANA);
  const byMember = await as(BEN, "update prayer_wall_posts set hidden_at = now() where id = $1 returning id", [id]);
  assert.equal(byMember.length, 0, "a member's hide changes nothing");
  assert.equal(await visible(BEN, id), true);

  const byModerator = await as(
    MOD,
    "update prayer_wall_posts set hidden_at = now(), hidden_by = $2 where id = $1 returning id",
    [id, MOD],
  );
  assert.equal(byModerator.length, 1);
  assert.equal(await visible(BEN, id), false);
  assert.equal(await visible(ANA, id), true);
  assert.equal(await visible(MOD, id), true);
});

test("expired requests drop out of members' view", async () => {
  const id = await post(ANA);
  await db.query("update prayer_wall_posts set expires_at = now() - interval '1 day' where id = $1", [id]);
  assert.equal(await visible(BEN, id), false);
});

test("nobody can reply to a request that's hidden or expired", async () => {
  const id = await post(ANA);
  await db.query("update prayer_wall_posts set hidden_at = now() where id = $1", [id]);
  await assert.rejects(
    as(BEN, "insert into prayer_wall_replies (post_id, author_id, kind, body) values ($1, $2, 'prayer', 'Amen')", [id, BEN]),
    /no longer open|row-level security/,
  );
});

test("a prayer reply carries the replier's screen name", async () => {
  const id = await post(ANA);
  const [reply] = await as<{ author_name: string }>(
    BEN,
    "insert into prayer_wall_replies (post_id, author_id, kind, body) values ($1, $2, 'prayer', 'Lord, give her peace') returning author_name",
    [id, BEN],
  );
  assert.equal(reply.author_name, "Ben");
  assert.equal((await as(DAN, "select id from prayer_wall_replies where post_id = $1", [id])).length, 1);
});

test("three reports hide a request until a moderator reviews it", async () => {
  const id = await post(ANA);
  for (const reporter of [BEN, CAL, DAN]) {
    await as(reporter, "insert into prayer_wall_reports (reporter_id, post_id) values ($1, $2)", [reporter, id]);
  }
  assert.equal(await visible(BEN, id), false);
  assert.equal(await visible(MOD, id), true);
});

test("members can't read reports; moderators can", async () => {
  assert.equal((await as(BEN, "select id from prayer_wall_reports")).length, 0);
  assert.ok((await as(MOD, "select id from prayer_wall_reports")).length >= 3);
});

test("an “I prayed” counts once per member and is server-only", async () => {
  const id = await post(ANA, "Pray for my dad's recovery.");
  await db.exec(`insert into prayer_wall_prayers (post_id, member_id) values ('${id}', '${BEN}')`);
  await assert.rejects(
    db.exec(`insert into prayer_wall_prayers (post_id, member_id) values ('${id}', '${BEN}')`),
    /duplicate key/,
  );
  await assert.rejects(as(BEN, "select * from prayer_wall_prayers"), /permission denied/);
  await assert.rejects(as(null, "select * from prayer_wall_prayers"), /permission denied/);
  // Deleting the request takes its prayers with it.
  await db.exec(`delete from prayer_wall_posts where id = '${id}'`);
  const left = await db.query(`select 1 from prayer_wall_prayers where post_id = '${id}'`);
  assert.equal(left.rows.length, 0);
});

test("a request's topic must be one the wall knows", async () => {
  const id = await post(ANA);
  await db.exec(`update prayer_wall_posts set topic = 'health', answered_at = now() where id = '${id}'`);
  await assert.rejects(db.exec(`update prayer_wall_posts set topic = 'gossip' where id = '${id}'`), /check/);
});

test("screen names are unique regardless of case, and renames follow past posts", async () => {
  const rename = (who: string, name: string) =>
    db.query("update profiles set screen_name = $2 where id = $1", [who, name]);
  await assert.rejects(rename(BEN, "ANA"), /duplicate key/);
  const id = await post(ANA);
  await assert.rejects(rename(ANA, "Ana C."), /profiles_screen_name_format/);
  await rename(ANA, "Ana Cruz");
  const [row] = await as<{ author_name: string }>(BEN, "select author_name from prayer_wall_posts where id = $1", [id]);
  assert.equal(row.author_name, "Ana Cruz");
});

// --- Dgroup table bookings ---------------------------------------------------

const book = (user: string, labels: string[], slot = "1900", day = "2026-10-08") => `
  select book_dgroup_tables('${SAT}', '${user}', 'welcome-center', array[${labels
    .map((l) => `'${l}'`)
    .join(",")}], ${labels.length * 4}, '${day}', '${slot}', 'Leader', '0917 123 4567',
    'leader@example.com', 3) as id`;

const holds = async (id: string) =>
  (
    await db.query<{ table_label: string }>(
      "select table_label from dgroup_table_holds where booking_id = $1 order by table_label",
      [id],
    )
  ).rows.map((r) => r.table_label);

test("a booking is confirmed at once and holds every table it was given", async () => {
  const { rows } = await db.query<{ id: string }>(book(ANA, ["4", "5"]));
  const [b] = (
    await db.query<{ status: string; table_labels: string[] }>(
      "select status, table_labels from dgroup_table_bookings where id = $1",
      [rows[0].id],
    )
  ).rows;
  assert.equal(b.status, "confirmed");
  assert.deepEqual(b.table_labels, ["4", "5"]);
  assert.deepEqual(await holds(rows[0].id), ["4", "5"]);
});

test("a table in someone else's booking can't be taken, and nothing half-books", async () => {
  await assert.rejects(db.query(book(BEN, ["5", "6"])), /dgroup_table_holds_one_per_table/);
  const { rows } = await db.query<{ n: number }>(
    "select count(*)::int as n from dgroup_table_bookings where user_id = $1",
    [BEN],
  );
  assert.equal(rows[0].n, 0);
});

test("cancelling frees the tables; a member books each day and slot once", async () => {
  const { rows } = await db.query<{ id: string }>(book(DAN, ["10"]));
  await assert.rejects(db.query(book(DAN, ["11"])), /one_per_member/);
  // Same member, another slot that day: allowed.
  await db.query(book(DAN, ["11"], "1300"));
  await db.exec(`update dgroup_table_bookings set status = 'cancelled' where id = '${rows[0].id}'`);
  assert.deepEqual(await holds(rows[0].id), []);
  await db.query(book(BEN, ["10"]));
});

test("moving a booking swaps its tables, and a failed move changes nothing", async () => {
  const { rows } = await db.query<{ id: string }>(book(CAL, ["13"]));
  const id = rows[0].id;
  await db.query(
    `select move_dgroup_booking('${id}', '${CAL}', 'welcome-center', array['14','15'], 8, '2026-10-09', '1300', 7)`,
  );
  assert.deepEqual(await holds(id), ["14", "15"]);
  const [moved] = (
    await db.query<{ booked_on: string; group_size: number }>(
      "select booked_on::text, group_size from dgroup_table_bookings where id = $1",
      [id],
    )
  ).rows;
  assert.equal(moved.booked_on, "2026-10-09");
  assert.equal(moved.group_size, 7);

  // Table 4 is Ana's on the 8th at 7 PM: the move is refused whole.
  await assert.rejects(
    db.query(
      `select move_dgroup_booking('${id}', '${CAL}', 'welcome-center', array['4'], 4, '2026-10-08', '1900', 3)`,
    ),
    /one_per_table/,
  );
  assert.deepEqual(await holds(id), ["14", "15"]);

  // Only the owner can move it.
  await assert.rejects(
    db.query(
      `select move_dgroup_booking('${id}', '${BEN}', 'welcome-center', array['1'], 4, '2026-10-09', '1600', 3)`,
    ),
    /booking not found/,
  );
});

test("blocked tables can't be booked or moved onto, and only the server sees blocks", async () => {
  await db.exec(`
    insert into dgroup_table_blocks (satellite_id, room_slug, table_label, booked_on, slot_id, reason)
      values ('${SAT}', 'welcome-center', '9', '2026-10-12', null, 'Repairs'),
             ('${SAT}', 'welcome-center', null, '2026-10-13', '1300', 'Leaders summit');
  `);
  // One table, all day.
  await assert.rejects(db.query(book(DAN, ["9"], "1600", "2026-10-12")), /blocked/);
  const [ok] = (await db.query<{ id: string }>(book(DAN, ["10"], "1600", "2026-10-12"))).rows;
  assert.ok(ok.id);
  // A whole room for one slot; other slots stay open.
  await assert.rejects(db.query(book(BEN, ["1"], "1300", "2026-10-13")), /blocked/);
  const [later] = (await db.query<{ id: string }>(book(BEN, ["1"], "1600", "2026-10-13"))).rows;
  // Moving onto a blocked table is refused and changes nothing.
  await assert.rejects(
    db.query(`select move_dgroup_booking('${later.id}', '${BEN}', 'welcome-center', array['2'], 4, '2026-10-13', '1300', 3)`),
    /blocked/,
  );
  assert.deepEqual(await holds(later.id), ["1"]);
  await assert.rejects(as(BEN, "select * from dgroup_table_blocks"), /permission denied/);
  await assert.rejects(as(null, "select * from dgroup_table_blocks"), /permission denied/);
});

test("members see only their own bookings and can't book or read holds directly", async () => {
  const mine = await as<{ user_id: string }>(BEN, "select user_id from dgroup_table_bookings");
  assert.ok(mine.length >= 1);
  assert.ok(mine.every((r) => r.user_id === BEN));
  await assert.rejects(as(BEN, book(BEN, ["9"], "1600")), /permission denied/);
  await assert.rejects(as(BEN, "select * from dgroup_table_holds"), /permission denied/);
});

// --- Member names and the Watch library -------------------------------------

// --- Firebase sign-in: linking accounts to profiles -------------------------

const link = async (uid: string, email: string, first: string | null = null, last: string | null = null) =>
  (
    await db.query<{ id: string }>("select link_firebase_member($1, $2, null, $3, $4) as id", [
      uid,
      email,
      first,
      last,
    ])
  ).rows[0].id;

test("a first Firebase sign-in with a known email keeps that member's profile", async () => {
  assert.equal(await link("fb-ana", "Ana@Example.com "), ANA);
  const { rows } = await db.query<{ firebase_uid: string }>("select firebase_uid from profiles where id = $1", [ANA]);
  assert.equal(rows[0].firebase_uid, "fb-ana");
  // Signing in again finds them by uid.
  assert.equal(await link("fb-ana", "ana@example.com"), ANA);
});

test("a new email gets a fresh profile, with Google's names filled in", async () => {
  const id = await link("fb-eve", "eve@example.com", " Eve ", "Santos");
  assert.notEqual(id, null);
  const { rows } = await db.query<{ first_name: string; last_name: string; email: string }>(
    "select first_name, last_name, email from profiles where id = $1",
    [id],
  );
  assert.deepEqual(rows[0], { first_name: "Eve", last_name: "Santos", email: "eve@example.com" });
  assert.equal(await link("fb-eve", "eve@example.com", "Someone", "Else"), id);
});

test("linking fills gaps but never overwrites a confirmed name", async () => {
  await db.query("update profiles set first_name = 'Benjamin', last_name = 'Reyes' where id = $1", [BEN]);
  assert.equal(await link("fb-ben", "ben@example.com", "Ben", "R"), BEN);
  const { rows } = await db.query<{ first_name: string; last_name: string }>(
    "select first_name, last_name from profiles where id = $1",
    [BEN],
  );
  assert.deepEqual(rows[0], { first_name: "Benjamin", last_name: "Reyes" });
});

test("only the server can link accounts", async () => {
  await assert.rejects(as(ANA, "select link_firebase_member('fb-x', 'ben@example.com')"), /permission denied/);
  await assert.rejects(as(null, "select link_firebase_member('fb-x', 'ben@example.com')"), /permission denied/);
  await assert.rejects(link("", "x@example.com"), /required/);
});

test("the Watch library is server-only and holds one pinned video at most", async () => {
  await assert.rejects(as(ANA, "select * from watch_replays"), /permission denied/);
  await db.exec(`insert into watch_replays (video_id, title, pinned) values ('aaaaaaaaaaa', 'One', true)`);
  await assert.rejects(
    db.exec(`insert into watch_replays (video_id, title, pinned) values ('bbbbbbbbbbb', 'Two', true)`),
    /watch_replays_one_pinned/,
  );
  await assert.rejects(db.exec(`insert into watch_replays (video_id, title) values ('bad id', 'X')`), /check/);
});

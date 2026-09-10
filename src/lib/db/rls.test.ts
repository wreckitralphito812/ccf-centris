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
    insert into auth.users (id, email) values
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

test("screen names are unique regardless of case, and renames follow past posts", async () => {
  await assert.rejects(as(BEN, "select set_screen_name('ANA')"), /duplicate key/);
  const id = await post(ANA);
  await assert.rejects(as(ANA, "select set_screen_name('Ana C.')"), /profiles_screen_name_format/);
  await as(ANA, "select set_screen_name('Ana Cruz')");
  const [row] = await as<{ author_name: string }>(BEN, "select author_name from prayer_wall_posts where id = $1", [id]);
  assert.equal(row.author_name, "Ana Cruz");
});

// --- Dgroup table bookings ---------------------------------------------------

const booking = (user: string, table: string, slot = "1800") => `
  insert into dgroup_table_bookings
    (satellite_id, user_id, room_slug, table_label, table_seats, booked_on, slot_id,
     leader_name, contact_mobile, group_size, agreed_rules_at)
  values ('${SAT}', '${user}', 'dgroup-lounge', '${table}', 6, '2026-09-14', '${slot}',
          'Leader', '0917 123 4567', 5, now())`;

test("a table can be booked once per slot; a cancelled booking frees it", async () => {
  await db.exec(booking(ANA, "L1"));
  await assert.rejects(db.exec(booking(BEN, "L1")), /one_per_table/);
  await db.exec(`update dgroup_table_bookings set status = 'cancelled' where user_id = '${ANA}' and table_label = 'L1'`);
  await db.exec(booking(BEN, "L1"));
});

test("a member can hold only one table per slot", async () => {
  await db.exec(booking(DAN, "L2"));
  await assert.rejects(db.exec(booking(DAN, "L3")), /one_per_member/);
});

test("members see only their own bookings and can't write them directly", async () => {
  const mine = await as<{ user_id: string }>(BEN, "select user_id from dgroup_table_bookings");
  assert.ok(mine.length >= 1);
  assert.ok(mine.every((r) => r.user_id === BEN));
  await assert.rejects(as(BEN, booking(BEN, "L4", "2000")), /permission denied/);
});

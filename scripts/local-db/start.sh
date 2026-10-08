#!/bin/bash
# A throwaway local copy of the database for end-to-end checks (2026-10-08).
#
# Postgres (Homebrew postgresql@16) with every migration in order, the same
# Supabase stand-in the RLS tests use, the satellite row and Adrian's
# October–November events; PostgREST in front of it, behind a tiny proxy so
# supabase-js finds it at /rest/v1 just as on Supabase. Times are UTC, like
# Supabase. Nothing here touches production.
#
#   brew install postgresql@16 postgrest     # once
#   scripts/local-db/start.sh                # fresh database, prints the env lines
#   scripts/local-db/stop.sh
#
# Put the two printed lines in .env.development.local (with a local
# ADMIN_ACCESS_CODE) and restart `npm run dev`.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$REPO/.local-db"
PG=/opt/homebrew/opt/postgresql@16/bin
export PGHOST=localhost PGPORT=54329 PGUSER=postgres LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
command -v postgrest >/dev/null || { echo "Install PostgREST first: brew install postgrest"; exit 1; }
"$(dirname "$0")/stop.sh" >/dev/null || { echo "Couldn't free the local-db ports; run scripts/local-db/stop.sh to see what's using them."; exit 1; }
rm -rf "$DIR" && mkdir -p "$DIR"
"$PG/initdb" -D "$DIR/data" -U postgres --auth=trust >/dev/null
"$PG/pg_ctl" -D "$DIR/data" -o "-p 54329 -c unix_socket_directories=''" -l "$DIR/pg.log" start >/dev/null
sleep 1
"$PG/createdb" ccf
node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");process.stdout.write(s.split("const SUPABASE_STANDIN = `")[1].split("`;")[0])' "$REPO/src/lib/db/rls.test.ts" > "$DIR/standin.sql"
psql -q -v ON_ERROR_STOP=1 -d ccf -f "$DIR/standin.sql"
psql -q -v ON_ERROR_STOP=1 -d ccf -c "create extension if not exists btree_gist with schema extensions; create extension if not exists pgcrypto with schema extensions; alter database ccf set timezone = 'UTC'; alter database ccf set search_path = \"\$user\", public, extensions; create role authenticator noinherit login; grant anon, authenticated, service_role to authenticator;"
for f in "$REPO"/supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d ccf -f "$f" >/dev/null 2>"$DIR/migrate.err" || { echo "Migration failed: $f"; cat "$DIR/migrate.err"; exit 1; }; done
psql -q -v ON_ERROR_STOP=1 -d ccf -c "insert into satellites (id, slug, name) values ('00000000-0000-0000-0000-0000000ce471','centris','CCF Centris');"
psql -q -v ON_ERROR_STOP=1 -d ccf -f "$REPO/supabase/catchup/2026-10-06-adrian-events.sql" >/dev/null

SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
cat > "$DIR/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@localhost:54329/ccf"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 54321
server-host = "127.0.0.1"
CONF
KEY=$(node -e '
const c=require("crypto"),s=process.argv[1],b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const h=b({alg:"HS256",typ:"JWT"}),p=b({role:"service_role",iss:"local-db"});
console.log(h+"."+p+"."+c.createHmac("sha256",s).update(h+"."+p).digest("base64url"));' "$SECRET")
nohup postgrest "$DIR/postgrest.conf" > "$DIR/postgrest.log" 2>&1 &
echo $! > "$DIR/postgrest.pid"
(nohup node "$REPO/scripts/local-db/proxy.mjs" > "$DIR/proxy.log" 2>&1 & echo $! > "$DIR/proxy.pid")
ok=""
for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:54320/rest/v1/events?limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" && { ok=1; break; }
  sleep 0.5
done
[ -n "$ok" ] || { echo "PostgREST didn't answer with the new key. See $DIR/postgrest.log"; exit 1; }
echo "Local database ready: $(psql -tA -d ccf -c 'select count(*) from events') events."
echo
echo "SUPABASE_URL=http://127.0.0.1:54320"
echo "SUPABASE_SERVICE_ROLE_KEY=$KEY"

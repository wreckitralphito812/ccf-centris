#!/bin/bash
# Stops the local database started by start.sh, and waits until its ports are free.
DIR="$(cd "$(dirname "$0")/../.." && pwd)/.local-db"
for p in postgrest proxy; do [ -f "$DIR/$p.pid" ] && kill "$(cat "$DIR/$p.pid")" 2>/dev/null; done
pkill -f "postgrest $DIR/postgrest.conf" 2>/dev/null
pkill -f "scripts/local-db/proxy.mjs" 2>/dev/null
LC_ALL=en_US.UTF-8 /opt/homebrew/opt/postgresql@16/bin/pg_ctl -D "$DIR/data" stop -m fast >/dev/null 2>&1
for _ in $(seq 1 20); do
  lsof -nP -iTCP:54320 -iTCP:54321 -iTCP:54329 -sTCP:LISTEN >/dev/null 2>&1 || { echo "Stopped."; exit 0; }
  sleep 0.5
done
echo "Something is still listening on 54320, 54321 or 54329:"; lsof -nP -iTCP:54320 -iTCP:54321 -iTCP:54329 -sTCP:LISTEN; exit 1

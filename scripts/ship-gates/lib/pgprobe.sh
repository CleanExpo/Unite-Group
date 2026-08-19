#!/usr/bin/env bash
# Shared primitives for the ship-gate proofs.
#
# WHY THIS EXISTS. Two independent review rounds (codex, 19/08/2026) broke three
# separate gates with the same move: the gate ran an experiment, dumped psql's
# output into one blob, and authenticated the run by grepping expected strings
# out of that blob. Swap the SQL for something that only emits those strings and
# the gate reports PASS having examined nothing. Rewriting the SQL inline did not
# fix it — the second round wrapped the inline heredoc in `\if false` and
# appended literal SELECTs emitting the same markers.
#
# The primitives here remove the blob. Every fact a gate asserts is fetched by
# its OWN psql invocation as a single scalar and compared in the shell. A forger
# must now rewrite the assertions themselves rather than the payload they read,
# which is a large and obvious diff rather than a one-file swap.
#
# They also remove the second defect class the same round found: three gates
# ran `DROP DATABASE IF EXISTS <fixed-name> (FORCE)` against the nominated
# cluster with no ownership check, deleting a pre-existing database of that name
# and its data. Nothing here drops a database it did not itself create.

set -uo pipefail

# ── scalar query ────────────────────────────────────────────────────────────
# Echoes one trimmed scalar on stdout. Returns psql's exit status. The caller
# compares the VALUE; it never greps a transcript.
pg_scalar() {
  local uri="$1" sql="$2"
  psql "$uri" -X -A -t -q -v ON_ERROR_STOP=1 -c "$sql" 2>/dev/null | tr -d '[:space:]'
  return "${PIPESTATUS[0]}"
}

# ── statement ───────────────────────────────────────────────────────────────
# Runs a statement. stdout and stderr are kept SEPARATE and stderr is written to
# $2 so a caller can require a specific error without conflating diagnostics
# with rows (the stream-merge defect, P1-3 of the first cross-agent round).
pg_exec() {
  local uri="$1" errfile="$2" sql="$3"
  psql "$uri" -X -A -t -q -v ON_ERROR_STOP=1 -c "$sql" >/dev/null 2>"$errfile"
}

# ── run a file, streams separated ───────────────────────────────────────────
pg_file() {
  local uri="$1" outfile="$2" errfile="$3" path="$4"
  psql "$uri" -X -A -t -q -v ON_ERROR_STOP=1 -f "$path" >"$outfile" 2>"$errfile"
}

# ── disposable database, never a fixed name, never a pre-existing one ───────
# Sets DISPOSABLE_DB / DISPOSABLE_URI. Aborts rather than reusing or dropping a
# database that already exists.
pg_make_disposable_db() {
  local admin_uri="$1" prefix="$2"
  local suffix name exists

  suffix="$(od -An -tx1 -N6 /dev/urandom | tr -d ' \n')"
  name="${prefix}_${suffix}"

  exists="$(pg_scalar "$admin_uri" "SELECT count(*) FROM pg_database WHERE datname = '${name}'")" || {
    echo "cannot run: could not query pg_database on the admin URI" >&2
    return 2
  }
  if [[ "$exists" != "0" ]]; then
    echo "refusing to proceed: ${name} already exists. This gate never reuses or drops a database it did not create." >&2
    return 2
  fi

  pg_exec "$admin_uri" /dev/null "CREATE DATABASE ${name}" || {
    echo "cannot run: CREATE DATABASE ${name} failed" >&2
    return 2
  }

  DISPOSABLE_DB="$name"
  # Swap the database component of the admin URI for the new one.
  DISPOSABLE_URI="${admin_uri%/*}/${name}"
  # Preserve any query string the admin URI carried.
  case "$admin_uri" in
    *\?*) DISPOSABLE_URI="${DISPOSABLE_URI}?${admin_uri#*\?}" ;;
  esac
  export DISPOSABLE_DB DISPOSABLE_URI
}

# Drops ONLY a database this process created via pg_make_disposable_db.
#
# THE REGISTRATION SURVIVES A FAILED DROP. An earlier revision suppressed the drop's
# status with `|| true` and cleared DISPOSABLE_DB on the very next line, so a transient
# connection error, a missing privilege or a refused FORCE left the scratch database
# behind AND erased the only record needed to retry it — a silent leak, in the helper
# whose entire job is guaranteeing there are none. Reported by an independent review
# (openrouter, 19/08/2026). The name is now cleared only when the drop actually
# succeeded, and a failure is announced on stderr rather than swallowed: a caller that
# ignores the status still gets a visible line, and one that checks it can retry.
pg_drop_disposable_db() {
  local admin_uri="$1" _db="${DISPOSABLE_DB:-}"
  [[ -n "$_db" ]] || return 0
  if pg_exec "$admin_uri" /dev/null "DROP DATABASE IF EXISTS ${_db} WITH (FORCE)"; then
    DISPOSABLE_DB=""
    return 0
  fi
  echo "WARNING: could not drop scratch database ${_db} — it is LEAKED and still registered for retry." >&2
  return 1
}

# ── cluster identity, for the NON-PROD control boundary ─────────────────────
# Returns a stable identity for the cluster behind a URI: the system identifier
# from pg_control, which differs between any two independently initdb'd
# clusters. Used to refuse a "control" that is the production cluster itself.
pg_cluster_identity() {
  local uri="$1"
  pg_scalar "$uri" "SELECT system_identifier::text FROM pg_control_system()"
}

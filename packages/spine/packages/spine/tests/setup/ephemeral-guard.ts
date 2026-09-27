// Prod-impossibility guard (RA-7753 slice 1a). Runs as vitest globalSetup, before any
// suite imports the DAL, so a mis-pointed SPINE_*_URL is refused before a single query.
//
// The suites write fixtures, drop schemas (idempotency) and deliberately break rules
// inside savepoints (identity_rules mutants). None of that may ever reach a hosted
// database. Four checks, all of which must pass for every configured URL:
//   1. host is loopback and port is 54322 (the port in supabase/config.toml);
//   2. the URL names no hosted Supabase marker or known project ref;
//   3. the sentinel table public.spine_ephemeral_sentinel exists — created ONLY by
//      ci/00_extensions.sql, never by a migration, so a database that was not built
//      by the CI bootstrap cannot carry it;
//   4. any failure THROWS. The run fails; nothing falls back to "skip".
//
// An UNSET variable is not a failure here: with no database the integration suites
// self-skip, and scripts/spine-evidence-selfcheck.mjs fails the CI job closed on the
// REQUIRED suites that did not execute. This guard's job is the other direction —
// a database that IS configured, but is the wrong one.
import postgres from 'postgres';

export const GUARDED_ENV = ['SPINE_DATABASE_URL', 'SPINE_MIGRATION_DATABASE_URL'] as const;
export const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];
export const EPHEMERAL_PORT = '54322';
export const FORBIDDEN_MARKERS = [
  'supabase.co',
  'supabase.com',
  'pooler',
  'xgqwfwqumliuguzhshwv',
  'lksfwktwtmyznckodsau',
  'udooysjajglluvuxkijp',
];
export const SENTINEL = 'public.spine_ephemeral_sentinel';

/** Throws unless `url` names the local ephemeral cluster. Never echoes the password. */
export function assertEphemeralUrl(name: string, url: string): void {
  const lowered = url.toLowerCase();
  const marker = FORBIDDEN_MARKERS.find((m) => lowered.includes(m));
  if (marker) {
    throw new Error(`EPHEMERAL GUARD: ${name} names a hosted database (matched "${marker}"). Refusing to run.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`EPHEMERAL GUARD: ${name} is not a parseable URL. Refusing to run.`);
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOOPBACK_HOSTS.includes(host)) {
    throw new Error(`EPHEMERAL GUARD: ${name} host "${host}" is not loopback. Refusing to run.`);
  }
  if (parsed.port !== EPHEMERAL_PORT) {
    throw new Error(`EPHEMERAL GUARD: ${name} port "${parsed.port}" is not ${EPHEMERAL_PORT}. Refusing to run.`);
  }
}

/** Throws unless the connected database carries the CI-bootstrap sentinel. */
export async function assertSentinel(name: string, sql: postgres.Sql | postgres.TransactionSql): Promise<void> {
  const rows = await sql<{ ok: boolean }[]>`select to_regclass(${SENTINEL}) is not null as ok`;
  if (!rows[0]?.ok) {
    throw new Error(
      `EPHEMERAL GUARD: ${name} has no ${SENTINEL}. Only ci/00_extensions.sql creates it; ` +
        'this database was not built by the ephemeral bootstrap. Refusing to run.',
    );
  }
}

export default async function setup(): Promise<void> {
  for (const name of GUARDED_ENV) {
    const url = process.env[name];
    if (!url) continue;
    assertEphemeralUrl(name, url);
    const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
    try {
      await assertSentinel(name, sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

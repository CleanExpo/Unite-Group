// Idempotency + teardown: proves the migration set rebuilds the full spine from empty,
// tears down clean, and is re-runnable.
//
// THIS SUITE IS DESTRUCTIVE, AND IT OWNS ITS OWN DATABASE (UNI-2597).
// It runs `drop schema core, marketing, … cascade` — that is the thing it tests.
// Pointed at the database the other integration suites read, it deletes their tables
// mid-query: observed as `relation "field.job" does not exist`, `relation
// "core.person" does not exist`, plus a deadlock inside this suite. The collision is
// older than either suite and was invisible for one reason only — with no database
// configured, every one of them skipped, so they could never run at the same time.
//
// It connects to SPINE_MIGRATION_DATABASE_URL, a separate database in the SAME
// ephemeral cluster, and never touches SPINE_DATABASE_URL.
//
// The two alternatives were tried and rejected, and neither should be reinstated:
//   * ordering the files (fileParallelism:false) — this suite still sorts ahead of
//     the data-dependent ones and leaves the schemas rebuilt but UNSEEDED, so they
//     then fail on empty tables. Ordering is not isolation.
//   * restoring schema + strangler + seed in afterAll — needs a role that bypasses
//     RLS (the tables are FORCE ROW LEVEL SECURITY) AND the ordering above, i.e. the
//     rejected option plus more machinery, with a durable dependency on what runs
//     next. Deleted by this change.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const SHARED_URL = process.env.SPINE_DATABASE_URL;
const MIGRATION_URL = process.env.SPINE_MIGRATION_DATABASE_URL;
const hasDb = !!MIGRATION_URL;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migrationsDir = join(root, 'migrations');
const SCHEMAS = ['core', 'marketing', 'leadgen', 'onboarding', 'nrpg', 'carsi', 'field', 'sales'];

// This suite's OWN connection. Deliberately not the DAL's db() singleton: db()
// reads SPINE_DATABASE_URL, so reaching for it here is exactly the mistake the
// separation prevents, and it would fail silently rather than loudly.
let sql: postgres.Sql;

beforeAll(() => {
  if (!hasDb) return;
  sql = postgres(MIGRATION_URL!, { max: 1, prepare: false, onnotice: () => {} });
});

afterAll(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

async function teardown(): Promise<void> {
  await sql.unsafe(`drop schema if exists ${SCHEMAS.join(', ')} cascade;`);
}
async function applyAll(): Promise<string[]> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('0000'))
    .sort();
  for (const f of files) await sql.unsafe(readFileSync(join(migrationsDir, f), 'utf8'));
  return files;
}
async function tableCount(): Promise<number> {
  const rows = await sql<{ n: number }[]>`
    select count(*)::int as n
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any(${SCHEMAS}) and c.relkind = 'r'`;
  return rows[0]!.n;
}

describe.skipIf(!hasDb)('migrations: reproducible apply + clean teardown', () => {
  // REQUIRED GUARD (UNI-2597 step 3). Without it, a future config change that points
  // both variables at one database silently re-merges them, the drops land back on
  // the shared fixture, and this suite still reports green — a suite passing for the
  // wrong reason, which is the exact false-success class UNI-2580 exists to remove.
  //
  // It compares what the SERVER reports, not the two URL strings. String inequality
  // is defeated without any intent to cheat: `localhost` vs `127.0.0.1`, a trailing
  // slash, a different password or an added `?sslmode=` all make two URLs that differ
  // textually while naming one database. Same cluster (system identifier) AND same
  // datname is what "the same database" actually means, so that is what is asserted.
  it('GUARD: the destructive suite is not pointed at the shared fixture', async () => {
    // Both variables are required together, and this is the louder half of saying
    // so. The two misconfigurations fail differently, and both are caught:
    //   * MIGRATION set, SHARED unset  -> this suite runs while every other
    //     integration suite self-skips. It fails HERE, immediately, rather than
    //     letting the destructive suite proceed with nothing to compare against.
    //   * SHARED set, MIGRATION unset  -> this whole suite skips (hasDb keys on
    //     MIGRATION), and the evidence check fails the job with
    //     REQUIRED_EVIDENCE_NOT_EXECUTED for migration-integrity.
    // Neither can reach a green job, which is the property that matters.
    expect(
      SHARED_URL,
      'CONFIGURATION ERROR: SPINE_MIGRATION_DATABASE_URL is set but SPINE_DATABASE_URL is not. ' +
        'They are required together — this suite has nothing to compare its target against, ' +
        'and every other integration suite is self-skipping right now.',
    ).toBeTruthy();

    const shared = postgres(SHARED_URL!, { max: 1, prepare: false, onnotice: () => {} });
    try {
      const [mine] = await sql<{ db: string; cluster: string }[]>`
        select current_database() as db, system_identifier::text as cluster from pg_control_system()`;
      const [theirs] = await shared<{ db: string; cluster: string }[]>`
        select current_database() as db, system_identifier::text as cluster from pg_control_system()`;

      expect(
        mine!.cluster === theirs!.cluster && mine!.db === theirs!.db,
        `the destructive migration suite is pointed at the SHARED fixture ` +
          `(cluster ${mine!.cluster}, database "${mine!.db}"). It drops every spine schema; ` +
          `running it there destroys the fixtures the RLS, isolation and outbox suites read. ` +
          `Point SPINE_MIGRATION_DATABASE_URL at a separate database.`,
      ).toBe(false);

      // Same cluster is the intent — one ephemeral service, two databases. Asserting
      // it makes a silent drift onto some unrelated server visible, rather than
      // merely satisfying the inequality above.
      expect(
        mine!.cluster,
        'both databases should live in the one ephemeral cluster',
      ).toBe(theirs!.cluster);
    } finally {
      await shared.end({ timeout: 5 });
    }
  });

  it('teardown → apply rebuilds the full spine (20 tables)', async () => {
    await teardown();
    const files = await applyAll();
    expect(files.length).toBeGreaterThan(0);
    expect(await tableCount()).toBe(20);
  });

  it('teardown leaves zero spine objects', async () => {
    await teardown();
    expect(await tableCount()).toBe(0);
  });

  it('the teardown→apply cycle is re-runnable (reproducible)', async () => {
    await teardown();
    await applyAll();
    const first = await tableCount();
    await teardown();
    await applyAll();
    expect(await tableCount()).toBe(first);
  });
});

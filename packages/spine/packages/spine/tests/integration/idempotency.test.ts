// Idempotency + teardown: proves the migration set rebuilds the full spine from empty,
// tears down clean, and is re-runnable. Runs in CI against an ephemeral DB.
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../../data-access/index.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migrationsDir = join(root, 'migrations');
const stranglerDir = join(root, 'strangler');
const seedFile = join(root, 'seed', '0001_seed.sql');

/** Non-test strangler files, in order — the harness that provides migrate.outbox. */
function stranglerFiles(): string[] {
  return readdirSync(stranglerDir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.test.sql'))
    .sort()
    .map((f) => join(stranglerDir, f));
}
const SCHEMAS = ['core', 'marketing', 'leadgen', 'onboarding', 'nrpg', 'carsi', 'field', 'sales'];

async function teardown(): Promise<void> {
  await db().unsafe(`drop schema if exists ${SCHEMAS.join(', ')} cascade;`);
}
async function applyAll(): Promise<string[]> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('0000'))
    .sort();
  for (const f of files) await db().unsafe(readFileSync(join(migrationsDir, f), 'utf8'));
  return files;
}
async function tableCount(): Promise<number> {
  const sql = db();
  const rows = await sql<{ n: number }[]>`
    select count(*)::int as n
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any(${SCHEMAS}) and c.relkind = 'r'`;
  return rows[0]!.n;
}

describe.skipIf(!hasDb)('migrations: reproducible apply + clean teardown', () => {
  // THIS SUITE IS DESTRUCTIVE — it drops all eight spine schemas. Every other
  // integration suite reads the seeded fixtures, so it must leave the database
  // as it found it, and must never run beside them.
  //
  // Both halves matter, and the second is not optional: vitest.config.ts sets
  // fileParallelism:false so nothing runs concurrently with this, and this hook
  // restores schema + seed so whatever runs AFTER still finds its fixtures.
  // Without the hook, suites ordered after this one query empty tables and fail
  // with "relation core.person does not exist" or silently see zero rows —
  // which reads exactly like an RLS defect and is not one.
  // The strangler harness is restored too, not just migrations and seed. Its
  // objects (migrate.relay_batch and friends) reference the core tables, so a
  // `drop schema core cascade` above takes them with it — and outbox_race runs
  // AFTER this file, gating itself on `to_regclass('migrate.outbox')`. Without
  // this it would find the harness gone and self-skip, which the evidence check
  // reports as REQUIRED_EVIDENCE_NOT_EXECUTED rather than as a failure, so the
  // job would go red for a reason that looks nothing like its cause.
  afterAll(async () => {
    await teardown();
    await applyAll();
    for (const f of stranglerFiles()) await db().unsafe(readFileSync(f, 'utf8'));
    await db().unsafe(readFileSync(seedFile, 'utf8'));
  }, 60_000);

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

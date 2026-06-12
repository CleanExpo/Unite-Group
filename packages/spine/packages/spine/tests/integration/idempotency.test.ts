// Idempotency + teardown: proves the migration set rebuilds the full spine from empty,
// tears down clean, and is re-runnable. Runs in CI against an ephemeral DB.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../../data-access/index.js';

const hasDb = !!process.env.SPINE_DATABASE_URL;
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');
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

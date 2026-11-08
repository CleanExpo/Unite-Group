// Campaign publish dedupe database proof (UNI-2326) on a THROWAWAY Postgres
// container. Never touches any real project: trust auth with no password, the
// port is bound to 127.0.0.1 only, and the container is removed on exit.
//   node scripts/campaign-publish-dedupe-db-proof.mjs [postgres image, default postgres:15]
// Steps: a control that the race is real without the key; apply the migration
// on a table that already holds duplicate rows, twice; race 20 concurrent
// guarded inserts (the statement PostgREST issues for the route's upsert);
// other writers unaffected; rollback keeps every row; forward applies again.
// Needs docker and a local postgres image. Prints
// CAMPAIGN_PUBLISH_DEDUPE_DB_PROOF_ALL_PASS and exits 0 only when every check held.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const image = process.argv[2] ?? 'postgres:15'
const require = createRequire(join(webDir, 'package.json'))
const { Client } = require('pg')
const MIGRATION = readFileSync(join(webDir, 'supabase/migrations/20261107120000_campaign_publish_dedupe.sql'), 'utf8')
const ROLLBACK = readFileSync(join(webDir, 'supabase/manual-applies/2026-11-07_campaign_publish_dedupe_rollback.sql'), 'utf8')
// A verifier may run with a system-only PATH, so the fixed install locations are tried first.
const DOCKER = ['C:/Program Files/Docker/Docker/resources/bin/docker.exe', '/usr/local/bin/docker', '/opt/homebrew/bin/docker']
  .find((p) => existsSync(p)) ?? 'docker'
const PORT = 55000 + Math.floor(Math.random() * 900)
const name = `uni2326-proof-${PORT}`
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`) }

const FOUNDER = '00000000-0000-4000-8000-0000000000f1'
const CAMPAIGN = '00000000-0000-4000-8000-0000000000c1'
const conn = () => new Client({ host: '127.0.0.1', port: PORT, user: 'postgres', database: 'postgres' })

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    const c = conn()
    try { await c.connect(); await c.query('select 1'); await c.end(); return } catch { await c.end().catch(() => {}); await new Promise((r) => setTimeout(r, 1000)) }
  }
  throw new Error('postgres did not become ready')
}

// The statement PostgREST issues for upsert(..., { onConflict, ignoreDuplicates: true }).select('id').
const GUARDED = `insert into public.social_posts (founder_id, business_key, content, platforms, status, campaign_id, campaign_platform)
  values ($1, 'ccw', 'copy', '["facebook"]'::jsonb, 'draft', $2, 'facebook')
  on conflict (campaign_id, campaign_platform) do nothing returning id`

async function race(sql, params, n = 20) {
  const clients = await Promise.all(Array.from({ length: n }, async () => { const c = conn(); await c.connect(); return c }))
  const errors = []
  const returned = await Promise.all(clients.map(async (c) => {
    try {
      await c.query('begin')
      const r = await c.query(sql, params)
      await c.query('select pg_sleep(0.3)') // hold the transaction open so the others overlap it
      await c.query('commit')
      return r.rowCount
    } catch (e) { errors.push(e.message); await c.query('rollback').catch(() => {}); return 0 }
  }))
  await Promise.all(clients.map((c) => c.end()))
  return { returned: returned.reduce((a, b) => a + b, 0), errors }
}

let started = false
try {
  execFileSync(DOCKER, ['run', '-d', '--rm', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', `127.0.0.1:${PORT}:5432`, image], { stdio: 'pipe' })
  started = true
  await waitReady()
  const db = conn(); await db.connect()
  const version = (await db.query('show server_version')).rows[0].server_version
  console.log(`image ${image}, server_version ${version}`)

  // Base schema: the columns of social_posts that matter, as on main (20260314000000).
  await db.query(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create table public.campaigns (id uuid primary key, founder_id uuid not null references auth.users(id));
    create table public.social_posts (
      id uuid default gen_random_uuid() primary key,
      founder_id uuid not null references auth.users(id) on delete cascade,
      business_key text not null, title text, content text not null,
      media_urls jsonb not null default '[]', platforms jsonb not null default '[]',
      status text not null default 'draft', scheduled_at timestamptz,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now());
    insert into auth.users values ('${FOUNDER}');
    insert into public.campaigns values ('${CAMPAIGN}', '${FOUNDER}');
    -- existing rows from other writers, including exact duplicates
    insert into public.social_posts (founder_id, business_key, content) values
      ('${FOUNDER}', 'ccw', 'old'), ('${FOUNDER}', 'ccw', 'old'), ('${FOUNDER}', 'ccw', 'old');`)

  // Control: same columns, NO unique key. The race must produce many rows,
  // otherwise this proof could not detect a missing key.
  await db.query(`alter table public.social_posts add column campaign_id uuid, add column campaign_platform text`)
  const control = await race(GUARDED.replace('on conflict (campaign_id, campaign_platform) do nothing', 'on conflict do nothing'), [FOUNDER, CAMPAIGN])
  const controlRows = Number((await db.query('select count(*) from public.social_posts where campaign_id = $1', [CAMPAIGN])).rows[0].count)
  check('control: without the unique key, 20 concurrent inserts create 20 rows', controlRows === 20, `rows=${controlRows}`)
  await db.query('delete from public.social_posts where campaign_id is not null')
  await db.query('alter table public.social_posts drop column campaign_id, drop column campaign_platform')
  void control

  // Apply the real migration file, twice (it must be re-runnable).
  await db.query(MIGRATION)
  await db.query(MIGRATION)
  check('migration applies on a table with existing duplicate rows, and re-applies', true)
  const constraint = (await db.query(`select pg_get_constraintdef(oid) d from pg_constraint where conname = 'social_posts_campaign_platform_key'`)).rows
  check('exactly one constraint named social_posts_campaign_platform_key', constraint.length === 1, constraint[0]?.d)

  const guarded = await race(GUARDED, [FOUNDER, CAMPAIGN])
  const guardedRows = Number((await db.query('select count(*) from public.social_posts where campaign_id = $1', [CAMPAIGN])).rows[0].count)
  check('with the key, 20 concurrent guarded inserts create exactly 1 row', guardedRows === 1, `rows=${guardedRows}`)
  check('exactly 1 of the 20 inserts returned an id (first insert wins)', guarded.returned === 1, `returned=${guarded.returned}`)
  check('the 19 losers were ignored, not errored', guarded.errors.length === 0, guarded.errors[0] ?? '')

  const other = await db.query(`insert into public.social_posts (founder_id, business_key, content, platforms, status, campaign_id, campaign_platform)
    values ($1, 'ccw', 'copy', '["linkedin"]'::jsonb, 'draft', $2, 'linkedin') on conflict (campaign_id, campaign_platform) do nothing returning id`, [FOUNDER, CAMPAIGN])
  check('a different platform for the same campaign still inserts', other.rowCount === 1)

  const plain = await db.query(`insert into public.social_posts (founder_id, business_key, content) values ($1, 'ccw', 'old'), ($1, 'ccw', 'old') returning id`, [FOUNDER])
  check('other writers (NULL campaign_id) are never blocked', plain.rowCount === 2)

  let raw = ''
  try {
    await db.query(`insert into public.social_posts (founder_id, business_key, content, campaign_id, campaign_platform) values ($1, 'ccw', 'x', $2, 'facebook')`, [FOUNDER, CAMPAIGN])
  } catch (e) { raw = e.code }
  check('a plain insert of a duplicate key is refused by the database (23505)', raw === '23505', raw)

  const before = Number((await db.query('select count(*) from public.social_posts')).rows[0].count)
  await db.query(ROLLBACK)
  const after = Number((await db.query('select count(*) from public.social_posts')).rows[0].count)
  const cols = (await db.query(`select column_name from information_schema.columns where table_name = 'social_posts' and column_name in ('campaign_id','campaign_platform')`)).rowCount
  check('rollback removes the key and both columns and keeps every row', cols === 0 && before === after, `rows ${before} -> ${after}, columns left ${cols}`)
  await db.query(MIGRATION)
  const back = (await race(GUARDED, [FOUNDER, CAMPAIGN])).returned
  check('after rollback the forward migration applies again and still guards', back === 1, `returned=${back}`)

  await db.query('delete from public.campaigns where id = $1', [CAMPAIGN])
  const kept = Number((await db.query(`select count(*) from public.social_posts where campaign_platform is not null and campaign_id is null`)).rows[0].count)
  check('deleting a campaign keeps its draft and clears campaign_id', kept === 1, `rows=${kept}`)

  await db.end()
} catch (e) {
  check('proof ran to completion', false, e.message)
} finally {
  if (started) { try { execFileSync(DOCKER, ['rm', '-f', name], { stdio: 'pipe' }) } catch { /* container already gone */ } }
}

const failed = results.filter((r) => !r.ok).length
console.log(`${results.length - failed}/${results.length} checks passed`)
if (failed === 0 && results.length > 0) console.log('CAMPAIGN_PUBLISH_DEDUPE_DB_PROOF_ALL_PASS')
process.exit(failed === 0 && results.length > 0 ? 0 : 1)

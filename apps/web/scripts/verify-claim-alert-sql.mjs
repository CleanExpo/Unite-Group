#!/usr/bin/env node
// Runs the real claim_alert SQL (and the alert erasure function) on a throwaway
// local PostgreSQL 15. It never reads a database URL from the environment and
// never connects anywhere except 127.0.0.1 on a random port it chose itself.
//
//   node scripts/verify-claim-alert-sql.mjs
//
// Exit 0 only when every check passed AND both planted defects (the advisory
// lock removed, ON CONFLICT removed) were caught by the same checks.
// Auth, roles and agent_actions are stubbed: only the columns the SQL touches.

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const BIN = process.env.PG15_BIN || '/opt/homebrew/opt/postgresql@15/bin'
const here = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS = path.resolve(here, '../supabase/migrations')
const CLAIM_MIGRATION = path.join(MIGRATIONS, '20261024090000_alert_delivery_log.sql')
const ERASE_MIGRATION = path.join(MIGRATIONS, '20261025000000_alert_erasure.sql')

const FOUNDER = '00000000-0000-4000-8000-000000000001'
const OTHER_FOUNDER = '00000000-0000-4000-8000-000000000002'
const KIND = 'new_lead'

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

function startServer(port, dataDir) {
  execFileSync(path.join(BIN, 'initdb'), ['-D', dataDir, '-U', 'postgres', '-A', 'trust', '--no-sync'], { stdio: 'ignore' })
  execFileSync(path.join(BIN, 'pg_ctl'), [
    '-D', dataDir, '-w', '-l', path.join(dataDir, 'server.log'),
    '-o', `-p ${port} -h 127.0.0.1 -c unix_socket_directories= -c fsync=off -c max_connections=60`,
    'start',
  ], { stdio: 'ignore' })
}

function stopServer(dataDir) {
  spawnSync(path.join(BIN, 'pg_ctl'), ['-D', dataDir, '-m', 'immediate', 'stop'], { stdio: 'ignore' })
}

const STUBS = `
-- Supabase creates service_role with BYPASSRLS; anon and authenticated are plain roles.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
insert into auth.users values ('${FOUNDER}'), ('${OTHER_FOUNDER}');
-- stub of the shared agent_actions table: only the columns the erasure function reads
create table public.agent_actions (
  id uuid primary key default gen_random_uuid(), source text, action_type text, payload jsonb);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.agent_actions to service_role;
`

function lockMutant(sql) {
  const mutated = sql.replace(/^\s*perform pg_advisory_xact_lock\(.*\);\s*$/m, '')
  if (mutated === sql) throw new Error('lock mutant did not change the SQL')
  return mutated
}
function conflictMutant(sql) {
  const mutated = sql.replace(/on conflict on constraint \w+ do nothing\s*returning/i, 'returning')
  if (mutated === sql) throw new Error('conflict mutant did not change the SQL')
  return mutated
}

async function withDatabase(admin, port, name, claimSql, run) {
  await admin.query(`create database ${name}`)
  const connect = async () => {
    const client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', database: name })
    await client.connect()
    return client
  }
  const setup = await connect()
  try {
    await setup.query(STUBS)
    await setup.query(claimSql)
    await setup.query(readFileSync(ERASE_MIGRATION, 'utf8'))
  } finally {
    await setup.end()
  }
  const opened = []
  const open = async () => {
    const client = await connect()
    opened.push(client)
    await client.query('set role service_role')
    return client
  }
  try {
    return await run(open, connect)
  } finally {
    await Promise.all(opened.map((client) => client.end().catch(() => {})))
  }
}

const claim = (client, source, key, window = 60, founder = FOUNDER) =>
  client.query('select channel from public.claim_alert($1,$2,$3,$4,$5)', [founder, KIND, source, key, window])
    .then((result) => result.rows.map((row) => row.channel))

async function rows(client, where = 'true', params = []) {
  return (await client.query(`select source_id, outcome, dedup_key from public.alert_delivery_log where ${where} order by source_id`, params)).rows
}

/** Every check returns [name, ok, detail]. */
async function checks(open, connect) {
  const out = []
  const record = (name, ok, detail = '') => out.push([name, Boolean(ok), detail])
  const a = await open()
  const b = await open()
  const c = await open()

  // 1. replay of the same source claims nothing the second time
  const firstClaim = await claim(a, 'lead-1', null)
  const replay = await claim(a, 'lead-1', null).catch((error) => [`error:${error.code}`])
  record('claim returns email once, replay returns nothing',
    JSON.stringify(firstClaim) === '["email"]' && replay.length === 0, JSON.stringify(replay))

  // 2. a second source with the same key inside the window is deduped
  await claim(a, 'lead-2', 'key-A')
  await a.query(`update public.alert_delivery_log set outcome='sent' where source_id='lead-2'`)
  const covered = await claim(b, 'lead-3', 'key-A')
  const row3 = (await rows(a, `source_id='lead-3'`))[0]
  record('sent source covers a different source with the same key', covered.length === 0 && row3?.outcome === 'deduped')

  // 3. things that must NOT cover
  await claim(a, 'lead-4', 'key-B')
  await a.query(`update public.alert_delivery_log set outcome='failed' where source_id='lead-4'`)
  record('failed row does not cover', (await claim(b, 'lead-5', 'key-B')).length === 1)
  await claim(a, 'lead-6', 'key-C')
  await a.query(`update public.alert_delivery_log set created_at = now() - interval '20 seconds' where source_id='lead-6'`)
  record('stale pending (>15 s) does not cover', (await claim(b, 'lead-7', 'key-C')).length === 1)
  await claim(a, 'lead-8', 'key-D')
  await a.query(`update public.alert_delivery_log set outcome='sent', created_at = now() - interval '90 minutes' where source_id='lead-8'`)
  record('sent row older than the 60 minute window does not cover', (await claim(b, 'lead-9', 'key-D')).length === 1)
  await claim(a, 'lead-10', 'key-E')
  await a.query(`update public.alert_delivery_log set outcome='sent' where source_id='lead-10'`)
  record('different key never covered', (await claim(b, 'lead-11', 'key-F')).length === 1)
  record('different founder never covered', (await claim(b, 'lead-12', 'key-E', 60, OTHER_FOUNDER)).length === 1)
  record('window is the argument, not a constant (0 minutes covers nothing)', (await claim(b, 'lead-13', 'key-E', 0)).length === 1)

  // 4. concurrency over real connections, many rounds: exactly one winner per key
  const crowd = []
  for (let i = 0; i < 8; i++) crowd.push(await open())
  let worst = 0
  let bad = ''
  for (let round = 0; round < 25; round++) {
    const key = `race-${round}`
    const wins = (await Promise.all(crowd.map((client, i) => claim(client, `race-${round}-${i}`, key)))).filter((r) => r.length).length
    if (wins !== 1) { worst = Math.max(worst, wins); bad = bad || key }
  }
  record('8 concurrent sources with one key produce exactly one winner (25 rounds)', worst === 0, bad && `first bad key ${bad}, worst winners ${worst}`)
  const sameSource = (await Promise.all(crowd.map((client) => claim(client, 'same-source', null).catch(() => ['error'])))).filter((r) => r.length === 1 && r[0] === 'email').length
  record('8 concurrent claims of one source produce exactly one winner', sameSource === 1, `winners ${sameSource}`)

  // 5. deterministic lock check: an uncommitted claim must block, then cover, a second claim
  await a.query('begin')
  const first = await claim(a, 'held-1', 'held-key')
  let settled = false
  const second = claim(b, 'held-2', 'held-key').then((r) => { settled = true; return r })
  await new Promise((resolve) => setTimeout(resolve, 400))
  const blocked = settled === false
  await a.query('commit')
  const secondResult = await second
  record('claim waits on the in-flight holder of the same key, then is deduped',
    first.length === 1 && blocked && secondResult.length === 0, `blocked=${blocked} second=${JSON.stringify(secondResult)}`)

  // 6. privileges and RLS
  const admin = await connect()
  try {
    const priv = async (role) => (await admin.query(
      `select has_function_privilege($1,'public.claim_alert(uuid,text,text,text,int)','execute') as ok`, [role])).rows[0].ok
    record('claim_alert executable by service_role only',
      (await priv('service_role')) && !(await priv('anon')) && !(await priv('authenticated')) && !(await priv('public')))
    const rls = (await admin.query(`select relrowsecurity, relforcerowsecurity from pg_class where relname='alert_delivery_log'`)).rows[0]
    record('RLS enabled and forced', rls.relrowsecurity && rls.relforcerowsecurity)
    const anon = await connect()
    await anon.query('set role authenticated')
    const denied = await anon.query(`select * from public.claim_alert('${FOUNDER}','new_lead','x','k',60)`).then(() => false, () => true)
    await anon.end()
    record('authenticated role cannot call claim_alert', denied)
  } finally {
    await admin.end()
  }

  // 7. erasure
  const person = 'person-key'
  await claim(a, 'erase-1', person)
  await a.query(`update public.alert_delivery_log set outcome='sent' where source_id='erase-1'`)
  await claim(a, 'erase-2', person) // deduped, different source, same key
  await claim(a, 'keep-1', 'someone-else')
  await a.query(`insert into public.agent_actions (source, action_type, payload) values
    ('margot','crm_timeline_lead_captured', '{"subjectId":"erase-1","metadata":{"email":"x"}}'),
    ('margot','crm_timeline_lead_captured', '{"subjectId":"keep-1"}'),
    ('margot','other_action', '{"subjectId":"erase-1"}')`)
  const erased = (await a.query(`select * from public.erase_lead_alert_data($1,$2,$3)`, [FOUNDER, 'erase-1', person])).rows[0]
  const left = (await rows(a, `source_id like 'erase-%' or source_id = 'keep-1'`)).map((row) => row.source_id)
  const actions = (await a.query(`select payload->>'subjectId' as s, action_type from public.agent_actions order by 2, 1`)).rows
  record('erasure removes the lead log rows and every row sharing its dedup key, nothing else',
    erased.log_rows_deleted === 2 && JSON.stringify(left) === '["keep-1"]', JSON.stringify({ erased, left }))
  record('erasure removes the lead timeline row and leaves other actions',
    erased.timeline_rows_deleted === 1 && actions.length === 2 && !actions.some((r) => r.s === 'erase-1' && r.action_type === 'crm_timeline_lead_captured'),
    JSON.stringify(actions))
  const none = (await a.query(`select * from public.erase_lead_alert_data($1,$2,null)`, [OTHER_FOUNDER, 'keep-1'])).rows[0]
  record('erasure is scoped to the founder', none.log_rows_deleted === 0 && (await rows(a, `source_id='keep-1'`)).length === 1)
  const eraseRpcOk = await (async () => {
    const x = await connect()
    await x.query('set role authenticated')
    const denied = await x.query(`select * from public.erase_lead_alert_data('${FOUNDER}','keep-1',null)`).then(() => false, () => true)
    await x.end()
    return denied
  })()
  record('erase_lead_alert_data not callable by authenticated', eraseRpcOk)
  return out
}

async function main() {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'claim-alert-pg-'))
  const port = await freePort()
  let admin
  const summary = []
  try {
    startServer(port, dataDir)
    admin = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' })
    await admin.connect()
    const real = readFileSync(CLAIM_MIGRATION, 'utf8')
    const variants = [
      ['real', real, null],
      ['mutant: advisory lock removed', lockMutant(real), ['claim waits on the in-flight holder of the same key, then is deduped']],
      ['mutant: ON CONFLICT removed', conflictMutant(real), ['claim returns email once, replay returns nothing']],
    ]
    let failures = 0
    for (const [label, sql, mustFail] of variants) {
      const name = `t_${Math.random().toString(36).slice(2, 10)}`
      let results
      try {
        results = await withDatabase(admin, port, name, sql, checks)
      } catch (error) {
        results = [[`harness error: ${error.message}`, false, '']]
      }
      const failed = results.filter(([, ok]) => !ok).map(([n]) => n)
      if (mustFail === null) {
        for (const [n, ok, detail] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok || !detail ? '' : `  (${detail})`}`)
        if (failed.length) failures += failed.length
      } else {
        if (process.env.VERBOSE) console.log(JSON.stringify(results))
        const caught = mustFail.every((n) => failed.includes(n))
        console.log(`${caught ? 'PASS' : 'FAIL'}  ${label} is caught by: ${mustFail.join('; ')}`)
        if (!caught) failures++
      }
      summary.push(label)
    }
    console.log(failures === 0 ? 'CLAIM_ALERT_SQL: PASS' : `CLAIM_ALERT_SQL: FAIL (${failures})`)
    process.exitCode = failures === 0 ? 0 : 1
  } finally {
    await admin?.end().catch(() => {})
    stopServer(dataDir)
    rmSync(dataDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('CLAIM_ALERT_SQL: ERROR', error.message)
  process.exit(2)
})

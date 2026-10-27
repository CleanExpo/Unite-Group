#!/usr/bin/env node
// Runs the real claim_alert SQL (and the alert erasure function) on a throwaway
// local PostgreSQL 15. It never reads a database URL from the environment and
// never connects anywhere except 127.0.0.1 on a random port it chose itself.
//
//   node scripts/verify-claim-alert-sql.mjs
//
// Every alert migration is applied in order, twice (re-application must not fail).
// Exit 0 only when every check passed, the concurrency oracle rejects zero and
// multiple winners, AND every planted defect (advisory lock removed, ON CONFLICT
// removed, covering source not recorded, erasure matching with ILIKE, erasure
// capped at 1000 leads) was caught by the check named for it.
// Auth, roles, crm_leads and agent_actions are stubbed: only the columns the SQL touches.

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
const V2_MIGRATION = path.join(MIGRATIONS, '20261025210000_alert_erasure_v2.sql')

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
-- stub of crm_leads: only the columns the erasure function reads and writes
create table public.crm_leads (
  id uuid primary key default gen_random_uuid(), founder_id uuid not null references auth.users(id),
  email text not null, interests text, additional_data jsonb not null default '{}'::jsonb);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.agent_actions to service_role;
grant select, insert, update, delete on public.crm_leads to service_role;
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

function coverMutant(sql) {
  // main as of 9de05deb: claim_alert never records which source covered a deduped row
  const mutated = sql.replace(/create or replace function public\.claim_alert\([\s\S]*?end \$\$;/, '')
  if (mutated === sql) throw new Error('cover mutant did not change the SQL')
  return mutated
}
function ilikeMutant(sql) {
  const mutated = sql.replace('lower(lead.email) = lower(target_email)', 'lead.email ilike target_email')
  if (mutated === sql) throw new Error('ilike mutant did not change the SQL')
  return mutated
}
function capMutant(sql) {
  const mutated = sql.replace(
    /from public\.crm_leads as lead\s+where lead\.founder_id = p_founder and lower\(lead\.email\) = lower\(target_email\);/,
    'from (select * from public.crm_leads as l where l.founder_id = p_founder and lower(l.email) = lower(target_email) order by l.id limit 1000) as lead;')
  if (mutated === sql) throw new Error('cap mutant did not change the SQL')
  return mutated
}

async function withDatabase(admin, port, name, v2Sql, run) {
  await admin.query(`create database ${name}`)
  const connect = async () => {
    const client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', database: name })
    await client.connect()
    return client
  }
  const setup = await connect()
  try {
    await setup.query(STUBS)
    // every alert migration in order, twice: the second pass proves re-application is safe
    for (let pass = 0; pass < 2; pass++) {
      await setup.query(readFileSync(CLAIM_MIGRATION, 'utf8'))
      await setup.query(readFileSync(ERASE_MIGRATION, 'utf8'))
      await setup.query(v2Sql)
    }
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

/** The concurrency oracle: every round must have exactly one winner. */
export function exactlyOneWinnerEveryRound(winsPerRound) {
  // Zero winners is a failure too: Math.max(worst, 0) used to leave worst at 0 and pass.
  const bad = winsPerRound.findIndex((wins) => wins !== 1)
  return { ok: winsPerRound.length > 0 && bad === -1,
    detail: bad === -1 ? (winsPerRound.length ? '' : 'no rounds ran') : `round race-${bad} had ${winsPerRound[bad]} winners` }
}

/** The oracle must reject zero and multiple winners, or a lost claim would pass as a race won. */
function oracleSelfTest() {
  const cases = [[[1, 1, 1], true], [[1, 0, 1], false], [[0, 0], false], [[1, 2, 1], false], [[8], false], [[], false]]
  return cases.map(([rounds, expected]) => [JSON.stringify(rounds), exactlyOneWinnerEveryRound(rounds).ok === expected])
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
  const winsPerRound = []
  for (let round = 0; round < 25; round++) {
    const key = `race-${round}`
    winsPerRound.push((await Promise.all(crowd.map((client, i) => claim(client, `race-${round}-${i}`, key)))).filter((r) => r.length).length)
  }
  const race = exactlyOneWinnerEveryRound(winsPerRound)
  record('8 concurrent sources with one key produce exactly one winner (25 rounds)', race.ok, race.detail)
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

  // 8. reversed transaction/lock order: the suppressed claim's transaction starts FIRST (earlier
  // now()) but takes the advisory lock SECOND; the covering source must still be recorded.
  await b.query('begin')
  await b.query('select now()')
  await new Promise((resolve) => setTimeout(resolve, 50))
  await claim(a, 'rev-winner', 'rev-key')
  await a.query(`update public.alert_delivery_log set outcome='sent' where source_id='rev-winner'`)
  const late = await claim(b, 'rev-late', 'rev-key')
  await b.query('commit')
  const rev = (await a.query(`select source_id, outcome, covered_by_source_id, created_at from public.alert_delivery_log
    where source_id in ('rev-winner','rev-late') order by source_id`)).rows
  const lateRow = rev.find((row) => row.source_id === 'rev-late')
  const winnerRow = rev.find((row) => row.source_id === 'rev-winner')
  record('reversed lock order: the deduped row is timestamped before its cover (the case is real)',
    late.length === 0 && lateRow?.outcome === 'deduped' && lateRow.created_at < winnerRow?.created_at,
    JSON.stringify(rev))
  record('reversed lock order: the deduped row records the covering source',
    lateRow?.covered_by_source_id === 'rev-winner', JSON.stringify(rev))
  record('a source that wins its own claim records no covering source',
    winnerRow?.covered_by_source_id === null, JSON.stringify(winnerRow))

  // 9. erasure for every enquiry from one address: exact, founder-scoped, uncapped, one call
  const lead = async (email, founder = FOUNDER, data = {}) => (await a.query(
    'insert into public.crm_leads (founder_id, email, additional_data) values ($1,$2,$3) returning id::text as id',
    [founder, email, data])).rows[0].id
  const timeline = (id) => a.query(`insert into public.agent_actions (source, action_type, payload)
    values ('margot','crm_timeline_lead_captured', jsonb_build_object('subjectId', $1::text))`, [id])
  const seed = async (id, key, outcome = 'sent') => {
    await claim(a, id, key, 0)
    await a.query('update public.alert_delivery_log set outcome=$2 where source_id=$1', [id, outcome])
    await timeline(id)
  }
  const erase = async (id, keys) => (await a.query(
    'select * from public.erase_lead_alert_data_for_email($1,$2,$3)', [FOUNDER, id, keys])).rows
  const logIds = async (ids) => (await a.query(
    'select source_id from public.alert_delivery_log where source_id = any($1) order by source_id', [ids])).rows.map((r) => r.source_id)
  const timelineIds = async (ids) => (await a.query(
    `select payload->>'subjectId' as s from public.agent_actions where payload->>'subjectId' = any($1) order by 1`, [ids])).rows.map((r) => r.s)
  const marked = async (ids) => (await a.query(
    `select id::text as id, additional_data from public.crm_leads where id::text = any($1) and additional_data ? 'alert_erased_at' order by 1`, [ids])).rows

  const star = await lead('a*b@example.invalid')
  const starAgain = await lead('A*B@Example.invalid', FOUNDER, { keep: 'me' })
  const starStranger = await lead('axyzb@example.invalid')
  const starLonger = await lead('a*bc@example.invalid')
  const otherFounderStar = await lead('a*b@example.invalid', OTHER_FOUNDER)
  await seed(star, 'k-star')
  await seed(starAgain, 'k-old-secret')
  await seed(starStranger, 'k-stranger')
  await seed(starLonger, 'k-longer')
  await claim(a, otherFounderStar, 'k-star', 0, OTHER_FOUNDER)
  await timeline(otherFounderStar)
  // log rows whose lead was already deleted: one keyed under the key the app passes, one under a
  // key that only the person's own surviving rows reveal
  await claim(a, 'deleted-lead-1', 'k-star', 0)
  await claim(a, 'deleted-lead-2', 'k-old-secret', 0)
  const starIds = [star, starAgain, starStranger, starLonger, otherFounderStar, 'deleted-lead-1', 'deleted-lead-2']
  const starResult = (await erase(star, ['k-star']))[0]
  record('literal-star address: erases exactly that address (any case), nobody the star would match',
    starResult?.leads_erased === 2 &&
      JSON.stringify(await logIds(starIds)) === JSON.stringify([starStranger, starLonger, otherFounderStar].sort()) &&
      JSON.stringify(await timelineIds(starIds)) === JSON.stringify([starStranger, starLonger, otherFounderStar].sort()),
    JSON.stringify({ starResult, logs: await logIds(starIds), timeline: await timelineIds(starIds) }))
  const starMarks = await marked(starIds)
  record('erasure tombstones only the erased leads and keeps their other additional_data',
    JSON.stringify(starMarks.map((row) => row.id)) === JSON.stringify([star, starAgain].sort()) &&
      starMarks.find((row) => row.id === starAgain)?.additional_data.keep === 'me' &&
      starMarks.every((row) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.additional_data.alert_erased_at)),
    JSON.stringify(starMarks))
  record('erasure removes rows of already-deleted leads by the passed key and by keys on the person\'s own rows',
    starResult?.log_rows_deleted === 4 && starResult?.timeline_rows_deleted === 2, JSON.stringify(starResult))

  const wild = await lead('a_b%@example.invalid')
  const wildStranger = await lead('axbzz@example.invalid')
  const wildStranger2 = await lead('a_b%@example.invalid.au')
  await seed(wild, 'k-wild')
  await seed(wildStranger, 'k-wild-stranger')
  await seed(wildStranger2, 'k-wild-stranger-2')
  const wildIds = [wild, wildStranger, wildStranger2]
  const wildResult = (await erase(wild, ['k-wild']))[0]
  record('percent and underscore address: erases exactly that address, nobody a LIKE pattern would match',
    wildResult?.leads_erased === 1 &&
      JSON.stringify(await logIds(wildIds)) === JSON.stringify([wildStranger, wildStranger2].sort()) &&
      JSON.stringify((await marked(wildIds)).map((row) => row.id)) === JSON.stringify([wild]),
    JSON.stringify({ wildResult, logs: await logIds(wildIds) }))

  const BULK = 1205
  const bulkIds = (await a.query(`insert into public.crm_leads (founder_id, email)
    select $1, case when g % 2 = 0 then 'bulk@example.invalid' else 'BULK@example.invalid' end
    from generate_series(1, $2) as g returning id::text as id`, [FOUNDER, BULK])).rows.map((r) => r.id)
  const bulkStranger = await lead('bulk@example.invalidx')
  await a.query(`insert into public.alert_delivery_log (founder_id, source_kind, source_id, channel, outcome, dedup_key)
    select $1, 'new_lead', id, 'email', 'sent', null from unnest($2::text[]) as id`, [FOUNDER, [...bulkIds, bulkStranger]])
  await a.query(`insert into public.agent_actions (source, action_type, payload)
    select 'margot', 'crm_timeline_lead_captured', jsonb_build_object('subjectId', id) from unnest($1::text[]) as id`, [[...bulkIds, bulkStranger]])
  const bulkResult = (await erase(bulkIds[0], []))[0]
  const bulkLeft = await logIds([...bulkIds, bulkStranger])
  const bulkTimelineLeft = await timelineIds([...bulkIds, bulkStranger])
  record(`more than 1000 matching leads (${BULK}): every one erased and counted in one call`,
    bulkResult?.leads_erased === BULK && bulkResult?.log_rows_deleted === BULK && bulkResult?.timeline_rows_deleted === BULK &&
      JSON.stringify(bulkLeft) === JSON.stringify([bulkStranger]) && JSON.stringify(bulkTimelineLeft) === JSON.stringify([bulkStranger]) &&
      (await marked(bulkIds)).length === BULK,
    JSON.stringify({ bulkResult, left: bulkLeft.length, timelineLeft: bulkTimelineLeft.length }))

  const foreign = (await a.query('select * from public.erase_lead_alert_data_for_email($1,$2,$3)',
    [FOUNDER, otherFounderStar, ['k-star']])).rows
  const missing = await erase('00000000-0000-4000-8000-00000000dead', ['k-star'])
  record('erasure of another founder\'s lead or an unknown lead returns no row and erases nothing',
    foreign.length === 0 && missing.length === 0 && (await logIds([otherFounderStar])).length === 1,
    JSON.stringify({ foreign, missing }))

  const admin2 = await connect()
  try {
    const priv = async (role) => (await admin2.query(
      `select has_function_privilege($1,'public.erase_lead_alert_data_for_email(uuid,uuid,text[])','execute') as ok`, [role])).rows[0].ok
    record('erase_lead_alert_data_for_email executable by service_role only',
      (await priv('service_role')) && !(await priv('anon')) && !(await priv('authenticated')) && !(await priv('public')))
    const anonClient = await connect()
    await anonClient.query('set role anon')
    const denied = await anonClient.query(`select * from public.erase_lead_alert_data_for_email('${FOUNDER}','${wildStranger}','{}')`)
      .then(() => false, () => true)
    await anonClient.end()
    record('anon cannot call erase_lead_alert_data_for_email', denied && (await logIds([wildStranger])).length === 1)
    const column = (await admin2.query(`select count(*)::int as n from information_schema.columns
      where table_name='alert_delivery_log' and column_name='covered_by_source_id'`)).rows[0].n
    const rls = (await admin2.query(`select relrowsecurity, relforcerowsecurity from pg_class where relname='alert_delivery_log'`)).rows[0]
    record('after the v2 migration ran twice: one covered_by_source_id column, RLS still enabled and forced',
      column === 1 && rls.relrowsecurity && rls.relforcerowsecurity)
  } finally {
    await admin2.end()
  }
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
    const real = readFileSync(V2_MIGRATION, 'utf8')
    const variants = [
      ['real', real, null],
      ['mutant: advisory lock removed', lockMutant(real), ['claim waits on the in-flight holder of the same key, then is deduped']],
      ['mutant: ON CONFLICT removed', conflictMutant(real), ['claim returns email once, replay returns nothing']],
      ['mutant: covering source not recorded (claim_alert as on main)', coverMutant(real),
        ['reversed lock order: the deduped row records the covering source']],
      ['mutant: erasure matches with ILIKE', ilikeMutant(real),
        ['percent and underscore address: erases exactly that address, nobody a LIKE pattern would match']],
      ['mutant: erasure capped at 1000 leads', capMutant(real),
        ['more than 1000 matching leads (1205): every one erased and counted in one call']],
    ]
    let failures = 0
    for (const [rounds, ok] of oracleSelfTest()) {
      console.log(`${ok ? 'PASS' : 'FAIL'}  concurrency oracle verdict for winners per round ${rounds}`)
      if (!ok) failures++
    }
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

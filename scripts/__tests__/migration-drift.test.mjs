// scripts/__tests__/migration-drift.test.mjs
//
// Guards for UNI-2757: merged migrations never reached the production database.
//
// Fixture: scripts/db/__fixtures__/prod-ledger-2026-11-23.txt is the production migration ledger as
// read (read-only) on 23/11/2026. Against it the drift script must FAIL, naming the two files whose
// tables are missing in production. The "repaired" ledger below is derived from the script's own
// repair plan, so the pass case is the plan being followed, not a hand-built happy path.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { executedCommands, readWorkflowStructure } from '../lib/workflow-yaml.mjs';
import {
  checkIdentity,
  computeDrift,
  DriftInputError,
  lintMigrations,
  replayBlockers,
  parseDbLint,
  parseLintBaseline,
  compareDbLint,
  listMigrationFiles,
  loadMap,
  main,
  checkArmed,
  parseLedger,
  repairPlan,
  verdict,
} from '../db/migration-drift.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAP_PATH = join(ROOT, 'scripts/db/migration-ledger-map.json');
const FIXTURE = join(ROOT, 'scripts/db/__fixtures__/prod-ledger-2026-11-23.txt');
const WORKFLOW = join(ROOT, '.github/workflows/db-migrations.yml');

const map = loadMap(MAP_PATH);
const files = listMigrationFiles(join(ROOT, map.migrationsDir));
const todayLedger = parseLedger(readFileSync(FIXTURE, 'utf8'));
const MISSING = ['20261105040000_gates_schema', '20261119090000_portal_projects'];

function capture() {
  const lines = [];
  return { lines, log: (m) => lines.push(String(m)), error: (m) => lines.push(String(m)) };
}

function toText(ledger) {
  return ledger.map((e) => `${e.version} ${e.name ?? ''}`.trim()).join('\n');
}

/** The ledger after the printed repair plan is followed and the two missing files are applied. */
function repairedLedger() {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  const versionOf = new Map(files.map((f) => [f.file, f.version]));
  const orphans = new Set(drift.orphans);
  const kept = todayLedger.filter((e) => !orphans.has(e.version));
  const added = [...drift.mappedApplied, ...drift.held, ...drift.unapplied].map((f) => ({ version: versionOf.get(f), name: f.slice(15) }));
  return [...kept, ...added];
}

// ── The real state ──────────────────────────────────────────────────────────

test('today\'s production ledger: exactly the two missing files are unapplied, and the drift check FAILS', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  assert.deepEqual(drift.unapplied, MISSING);
  assert.ok(verdict(drift, 'report').some((w) => w.includes('20261105040000_gates_schema')));
  const out = capture();
  assert.equal(main(['--ledger', FIXTURE], out), 1);
});

test('the seven hand-applied files are recognised under their ledger versions, not reported as missing', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  for (const f of [
    '20261016190000_idea_evidence_admission',
    '20261024210000_card_enquiries_feedback',
    '20261024230000_card_owner_seed_phill',
    '20261024090000_alert_delivery_log',
    '20261025100000_card_orders',
    '20261025120000_site_events',
    '20261025200000_card_orders_extra_business',
  ]) {
    assert.ok(drift.mappedApplied.includes(f), `${f} should be applied under another version`);
    assert.ok(!drift.unapplied.includes(f));
  }
});

test('files that cannot be proven applied are HELD, never silently treated as applied', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  assert.ok(drift.held.includes('20260908020000_coaching_seed_klim_spiroski'));
  assert.ok(drift.held.includes('20261006000000_public_agent_quota'));
  assert.ok(drift.held.includes('20260807010000_founder_chat_threads'));
  const why = verdict(drift, 'pre-push');
  assert.ok(why.some((w) => w.includes('coaching_seed_klim_spiroski')), 'db push would apply the seed: must block');
});

test('pre-push also blocks on ledger rows with no file, which make `supabase db push` refuse to run', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  assert.ok(drift.orphans.length > 100);
  assert.ok(verdict(drift, 'pre-push').some((w) => w.includes('no file')));
});

test('after the repair plan is followed and the two files are present, report and pre-push both PASS', () => {
  const ledger = repairedLedger();
  const drift = computeDrift({ files, ledger, map });
  assert.deepEqual(drift.unapplied, []);
  assert.deepEqual(drift.held, []);
  assert.deepEqual(drift.orphans, []);
  assert.deepEqual(verdict(drift, 'report'), []);
  assert.deepEqual(verdict(drift, 'pre-push'), []);
});

test('with only the two files added (repair not done) report still fails on held files: no false pass', () => {
  const ledger = [...todayLedger, ...MISSING.map((f) => ({ version: f.slice(0, 14), name: f.slice(15) }))];
  const drift = computeDrift({ files, ledger, map });
  assert.deepEqual(drift.unapplied, []);
  assert.ok(verdict(drift, 'report').length > 0);
});

test('a brand-new migration file is reported as pending, so a merge that adds one is visible', () => {
  const extra = { file: '20261201000000_new_thing', version: '20261201000000', name: 'new_thing', valid: true };
  const drift = computeDrift({ files: [...files, extra], ledger: repairedLedger(), map });
  assert.deepEqual(drift.unapplied, [extra.file]);
});

test('a map entry whose ledger version is absent from the ledger does NOT count as applied', () => {
  const dropped = map.mapped[0].ledgerVersion;
  const ledger = todayLedger.filter((e) => e.version !== dropped);
  const drift = computeDrift({ files, ledger, map });
  assert.ok(drift.unapplied.includes(map.mapped[0].file));
});

// ── Fail closed on unreadable input ─────────────────────────────────────────

test('an empty or unparseable ledger is an input error (exit 2), never "no drift"', () => {
  assert.throws(() => parseLedger(''), DriftInputError);
  assert.throws(() => parseLedger('   \n'), DriftInputError);
  assert.throws(() => parseLedger('[]'), DriftInputError);
  assert.throws(() => parseLedger('[not json'), DriftInputError);
  assert.throws(() => parseLedger('Error: connection refused'), DriftInputError);
  const dir = mkdtempSync(join(tmpdir(), 'drift-'));
  try {
    const empty = join(dir, 'empty.txt');
    writeFileSync(empty, '');
    const run = spawnSync(process.execPath, [join(ROOT, 'scripts/db/migration-drift.mjs'), '--ledger', empty], { encoding: 'utf8' });
    assert.equal(run.status, 2, run.stdout + run.stderr);
    const missing = spawnSync(process.execPath, [join(ROOT, 'scripts/db/migration-drift.mjs'), '--ledger', join(dir, 'nope.txt')], { encoding: 'utf8' });
    assert.equal(missing.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseLedger reads the CLI table, JSON and name lines to the same versions', () => {
  const table = [
    '   Local          | Remote         | Time (UTC)          ',
    '  ----------------|----------------|---------------------',
    '   20260309000000 | 20260309000000 | 2026-03-09 00:00:00 ',
    '                  | 001            | 001                 ',
    '   20261119090000 |                | 2026-11-19 09:00:00 ',
  ].join('\n');
  assert.deepEqual(parseLedger(table).map((e) => e.version), ['20260309000000', '001']);
  // the CLI's own output: code-span cells, "` `" for empty, with or without outer pipes (makeTable + glamour)
  const markdown = [
    '|Local|Remote|Time (UTC)|',
    '|-|-|-|',
    '|`20260309000000`|`20260309000000`|`2026-03-09 00:00:00`|',
    '|` `|`001`|`001`|',
    '|`20261119090000`|` `|`2026-11-19 09:00:00`|',
  ].join('\n');
  assert.deepEqual(parseLedger(markdown).map((e) => e.version), ['20260309000000', '001'], 'reads Remote, not Local, with outer pipes');
  const rendered = [
    '                                                    ',
    '    Local            | Remote           | Time (UTC)            ',
    '  -------------------|------------------|---------------------- ',
    '    `20260309000000` | `20260309000000` | `2026-03-09 00:00:00` ',
    '    ` `              | `001`            | `001`                 ',
    '    `20261119090000` | ` `              | `2026-11-19 09:00:00` ',
  ].join('\n');
  assert.deepEqual(parseLedger(rendered).map((e) => e.version), ['20260309000000', '001'], 'reads Remote without outer pipes');
  assert.throws(() => parseLedger('|`20260309000000`|`20260309000000`|`x`|'), DriftInputError, 'a table with no header is refused');
  assert.deepEqual(parseLedger('[{"version":"20260309000000","name":"a"},"001 b"]').map((e) => e.version), ['20260309000000', '001']);
  assert.deepEqual(parseLedger('20260309000000 a\n001 b').map((e) => e.name), ['a', 'b']);
});

// ── Lint and the map ────────────────────────────────────────────────────────

test('the committed files and map lint clean', () => {
  assert.deepEqual(lintMigrations(files, map), []);
});

test('lint catches a bad name, a duplicate version, a map entry for a missing file and a clash with a real version', () => {
  const bad = [...files, { file: 'Bad Name', valid: false }, { file: '20261105040000_dup', version: '20261105040000', name: 'dup', valid: true }];
  const problems = lintMigrations(bad, {
    ...map,
    mapped: [...map.mapped, { file: 'no_such_file', ledgerVersion: '20990101000000' }, { file: files[0].file, ledgerVersion: files[1].version }],
  });
  assert.ok(problems.some((p) => p.includes('Bad Name')));
  assert.ok(problems.some((p) => p.includes('also used by')));
  assert.ok(problems.some((p) => p.includes('no_such_file')));
  assert.ok(problems.some((p) => p.includes('also a real file version')));
});

test('replay rule: a DO block that reads application rows may not abort on missing data', () => {
  const seedRaises = [
    'do $$ declare v uuid; begin',
    '  select founder_id into v from public.crm_contacts limit 1;',
    "  if v is null then raise exception 'no founder'; end if;",
    'end $$;',
  ].join('\n');
  const seedBareRaise = "do $x$ declare n int; begin select count(*) into n from (select id from auth.users) u; if n = 0 then raise 'none'; end if; end $x$;";
  const seedSkips = [
    'do $$ declare v uuid; begin',
    '  select founder_id into v from public.crm_contacts limit 1;',
    "  if v is null then raise notice 'skipped'; return; end if;",
    '  -- a comment that says raise exception is not code',
    'end $$;',
  ].join('\n');
  const schemaGuard = "do $$ declare n int; begin select count(*) into n from pg_catalog.pg_class where relname = 'x'; if n > 0 then raise exception 'exists'; end if; end $$;";
  const functionBody = "create function public.f() returns void language plpgsql as $$ begin raise exception 'runtime check'; end $$;";
  assert.equal(replayBlockers(seedRaises).length, 1);
  assert.equal(replayBlockers(seedBareRaise).length, 1);
  assert.deepEqual(replayBlockers(seedSkips), []);
  assert.deepEqual(replayBlockers(schemaGuard), []);
  assert.deepEqual(replayBlockers(functionBody), []);
  // forms a narrower rule would miss: an unqualified table, an EXISTS test, a second DO block after a clean one
  const unqualified = "do $$ declare v uuid; begin select founder_id into v from crm_contacts limit 1; if v is null then raise exception 'x'; end if; end $$;";
  const existsTest = "do $$ begin if not exists (select 1 from public.crm_leads) then raise exception 'x'; end if; end $$;";
  const secondBlock = `${schemaGuard}\n\n${seedRaises}`;
  assert.equal(replayBlockers(unqualified).length, 1);
  assert.equal(replayBlockers(existsTest).length, 1);
  assert.deepEqual(replayBlockers(secondBlock).map((p) => p.slice(0, 18)), ['DO block at line 3']);
  // a table name inside a string or comment is not a read
  const quoted = "do $$ declare n int; begin select count(*) into n from pg_class; -- from public.crm_contacts\n if n < 0 then raise exception 'missing from public.crm_contacts'; end if; end $$;";
  assert.deepEqual(replayBlockers(quoted), []);
  // a conflict guard after the empty-database skip is allowed; the same guard before it is not
  const skipThenGuard = "do $$ declare n int; begin select count(*) into n from public.crm_leads; if n = 0 then raise notice 'empty'; return; end if; if n > 1 then raise exception 'conflict'; end if; end $$;";
  const guardThenSkip = "do $$ declare n int; begin select count(*) into n from public.crm_leads; if n > 1 then raise exception 'conflict'; end if; if n = 0 then raise notice 'empty'; return; end if; end $$;";
  assert.deepEqual(replayBlockers(skipThenGuard), []);
  assert.equal(replayBlockers(guardThenSkip).length, 1);
  const problems = lintMigrations([...files, { file: '20990101000000_seed', version: '20990101000000', name: 'seed', valid: true, sql: seedRaises }], map);
  assert.ok(problems.some((p) => p.startsWith('20990101000000_seed.sql: DO block at line 1 reads public.crm_contacts')));
});

test('every committed migration file was read, so the replay rule saw real SQL', () => {
  assert.ok(files.length > 100);
  assert.ok(files.every((f) => typeof f.sql === 'string' && f.sql.length > 0));
});

// ── Schema lint baseline ────────────────────────────────────────────────────

const LINT_FIXTURE = join(ROOT, 'scripts/db/__fixtures__/db-lint-2026-11-23.txt');
const BASELINE_PATH = join(ROOT, 'scripts/db/lint-baseline.json');
const KNOWN_FOUR = [
  'public.get_video_pipeline_stats|42703|column "cnt" does not exist',
  'public.match_business_docs|42703|column p.body does not exist',
  'public.erase_lead_alert_data|42P01|relation "public.agent_actions" does not exist',
  'public.erase_lead_alert_data_for_email|42P01|relation "public.agent_actions" does not exist',
];
const keyOf = (e) => `${e.function}|${e.sqlState}|${e.message}`;

test('db lint: the exact four known errors (real CI output) pass against the committed baseline', () => {
  const found = parseDbLint(readFileSync(LINT_FIXTURE, 'utf8'));
  const baseline = parseLintBaseline(readFileSync(BASELINE_PATH, 'utf8'));
  assert.deepEqual(found.map(keyOf), KNOWN_FOUR, 'warnings are ignored, the four errors are read');
  assert.deepEqual(baseline.map(keyOf), KNOWN_FOUR);
  assert.ok(baseline.every((e) => e.ticket === 'UNI-3531' && e.reason.length > 0));
  assert.deepEqual(compareDbLint(found, baseline), []);
  assert.equal(main(['--db-lint', LINT_FIXTURE], capture()), 0);
});

test('db lint: a planted new error fails, by name', () => {
  const baseline = parseLintBaseline(readFileSync(BASELINE_PATH, 'utf8'));
  const found = [...parseDbLint(readFileSync(LINT_FIXTURE, 'utf8')), { function: 'public.new_fn', sqlState: '42703', message: 'column x does not exist' }];
  const why = compareDbLint(found, baseline);
  assert.deepEqual(why, ['new schema lint error (not in lint-baseline.json): public.new_fn 42703 column x does not exist']);
  // the same error text on a different function is still new: the key is exact
  const moved = [...parseDbLint(readFileSync(LINT_FIXTURE, 'utf8')), { function: 'public.other_fn', sqlState: '42703', message: 'column "cnt" does not exist' }];
  assert.equal(compareDbLint(moved, baseline).length, 1);
  const dir = mkdtempSync(join(tmpdir(), 'dblint-'));
  try {
    const f = join(dir, 'lint.txt');
    const planted = readFileSync(LINT_FIXTURE, 'utf8').replace(/\]\s*$/, ',{"function":"public.new_fn","issues":[{"level":"error","message":"boom","sqlState":"XX000"}]}]');
    writeFileSync(f, planted);
    assert.equal(main(['--db-lint', f], capture()), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('db lint: a stale baseline entry (its error no longer occurs) fails, so the baseline shrinks', () => {
  const baseline = parseLintBaseline(readFileSync(BASELINE_PATH, 'utf8'));
  const fixed = parseDbLint(readFileSync(LINT_FIXTURE, 'utf8')).filter((e) => e.function !== 'public.match_business_docs');
  const why = compareDbLint(fixed, baseline);
  assert.equal(why.length, 1);
  assert.ok(why[0].startsWith('stale baseline entry, the error no longer occurs: public.match_business_docs'));
  // a clean lint with the four entries still listed fails four times
  assert.equal(compareDbLint(parseDbLint('Linting schema: public\nNo schema errors found\n'), baseline).length, 4);
});

test('db lint: unreadable output and loose baseline entries are input errors, never a pass', () => {
  assert.throws(() => parseDbLint(''), DriftInputError);
  assert.throws(() => parseDbLint('Connecting to local database...\nerror: connection refused'), DriftInputError);
  assert.throws(() => parseDbLint('[ not json'), DriftInputError);
  const entry = { function: 'public.f', sqlState: '42703', message: 'm', reason: 'r', ticket: 'UNI-1' };
  const bad = (e) => JSON.stringify({ entries: [{ ...entry, ...e }] });
  assert.equal(parseLintBaseline(bad({})).length, 1);
  for (const e of [{ function: '*' }, { function: 'public.*' }, { function: 'f' }, { message: '%' }, { message: 'column * does not exist' }, { sqlState: '' }, { sqlState: 'all' }, { reason: '' }, { ticket: 'UNI-TBD' }]) {
    assert.throws(() => parseLintBaseline(bad(e)), DriftInputError, JSON.stringify(e));
  }
  assert.throws(() => parseLintBaseline(JSON.stringify({ entries: [entry, entry] })), DriftInputError);
  assert.throws(() => parseLintBaseline('{}'), DriftInputError);
});

// ── Production identity ─────────────────────────────────────────────────────

test('identity passes for the production ref and history, and fails for another ref, a missing ref or a thin history', () => {
  assert.deepEqual(checkIdentity({ linkedRef: `${map.prodProjectRef}\n`, ledger: todayLedger, map }), []);
  assert.ok(checkIdentity({ linkedRef: 'xgqwfwqumliuguzhshwv', ledger: todayLedger, map }).length > 0);
  assert.ok(checkIdentity({ linkedRef: '', ledger: todayLedger, map }).length > 0);
  assert.ok(checkIdentity({ linkedRef: undefined, ledger: todayLedger, map }).length > 0);
  assert.ok(checkIdentity({ linkedRef: map.prodProjectRef, ledger: [{ version: '20260309000000', name: null }], map }).length > 0);
});

test('identity still passes on the repaired ledger (sentinels survive the repair plan)', () => {
  assert.deepEqual(checkIdentity({ linkedRef: map.prodProjectRef, ledger: repairedLedger(), map }), []);
});

// ── Repair plan prints only ─────────────────────────────────────────────────

test('the repair plan names applied, reverted and held, and is plain text', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  const plan = repairPlan(drift, map, files);
  assert.match(plan, /migration repair .*--status applied 20260706090000/);
  assert.match(plan, /migration repair .*--status reverted /);
  assert.match(plan, /coaching_seed_klim_spiroski \[data-seed\]/);
  assert.match(plan, /Nothing here has been run/);
});

test('repair-plan.sh refuses without a ledger file and prints a plan with one; it never runs a repair', () => {
  const script = join(ROOT, 'scripts/db/repair-plan.sh');
  const none = spawnSync('bash', [script], { encoding: 'utf8' });
  assert.equal(none.status, 2);
  const out = execFileSync('bash', [script, FIXTURE], { encoding: 'utf8' });
  assert.match(out, /--status applied/);
  const body = readFileSync(script, 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  const invokes = /^\s*(exec\s+|sudo\s+)?supabase\b|[;&|]\s*supabase\b|\$\(\s*supabase\b/m;
  assert.doesNotMatch(body, invokes, 'the script must not invoke the supabase CLI');
  assert.match(`${body}\nsupabase migration repair --linked`, invokes, 'negative control: the check must see a planted call');
});

// ── Repair plan scope and the arming switch ───────────────────────────────

test('the plan separates replaced rows (known replacement) from legacy history (a named decision with a backup step)', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  const plan = repairPlan(drift, map, files, todayLedger);
  const reverted = plan.split('\n').filter((l) => l.startsWith('supabase migration repair') && l.includes('--status reverted'));
  assert.equal(reverted.length, 2, 'one replaced step and one separate legacy step');
  const replacedCmd = reverted[0].split(' ');
  for (const m of map.mapped) assert.ok(replacedCmd.includes(m.ledgerVersion), `${m.ledgerVersion} is replaced`);
  assert.ok(!replacedCmd.includes('001'), 'legacy history must not ride along with the routine step');
  assert.match(plan, /DECISION NEEDED\. 118 ledger row/);
  assert.match(plan, /supabase_migrations\.schema_migrations/);
  assert.match(plan, /# {4}001 initial_schema/, 'each legacy row is listed with its name');
});

test('repairPlan refuses an inconsistent map instead of printing commands from it', () => {
  const drift = computeDrift({ files, ledger: todayLedger, map });
  const bad = { ...map, mapped: [...map.mapped, { file: 'absent_file', ledgerVersion: '123' }] };
  assert.throws(() => repairPlan(drift, bad, files), DriftInputError);
});

test('the arming switch logic: only an exact armed + matching ref passes, in either file state', () => {
  // Deliberately NOT pinned to the committed value: arming is a reviewed commit that flips the file,
  // and a test that required `false` forever would make that commit fail its own required check.
  assert.deepEqual(checkArmed({ armed: { armed: true, projectRef: map.prodProjectRef }, map }), []);
  assert.ok(checkArmed({ armed: { armed: false, projectRef: map.prodProjectRef }, map }).length > 0);
  assert.ok(checkArmed({ armed: { armed: 'true', projectRef: map.prodProjectRef }, map }).length > 0);
  assert.ok(checkArmed({ armed: { armed: true, projectRef: 'other' }, map }).length > 0);
  assert.ok(checkArmed({ armed: null, map }).length > 0);
  assert.ok(checkArmed({ armed: { projectRef: map.prodProjectRef }, map }).length > 0);
});

test('the CLI arming check reads the file it is given: armed passes, disarmed fails, unreadable fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'armed-'));
  try {
    const on = join(dir, 'on.json');
    const off = join(dir, 'off.json');
    writeFileSync(on, JSON.stringify({ armed: true, projectRef: map.prodProjectRef }));
    writeFileSync(off, JSON.stringify({ armed: false, projectRef: map.prodProjectRef }));
    assert.equal(main(['--require-armed', '--armed-file', on], capture()), 0);
    assert.equal(main(['--require-armed', '--armed-file', off], capture()), 1);
    assert.throws(() => main(['--require-armed', '--armed-file', join(dir, 'absent.json')], capture()));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('arming once never approves a later migration: pre-push refuses every pending file not in approvedFiles', () => {
  const later = { file: '20261201000000_later_change', version: '20261201000000', name: 'later_change', valid: true };
  const ledger = repairedLedger().filter((e) => !MISSING.some((f) => f.slice(0, 14) === e.version));
  const drift = computeDrift({ files: [...files, later], ledger, map });
  assert.deepEqual(drift.unapplied, [...MISSING, later.file]);
  // approval names the two reviewed files only: the later migration is refused by name
  const why = verdict(drift, 'pre-push', MISSING);
  assert.deepEqual(why, [`not approved for this apply: ${later.file} is not listed in production-apply.json approvedFiles`]);
  assert.equal(verdict(drift, 'pre-push', []).length, 3, 'an empty list approves nothing');
  assert.deepEqual(verdict(drift, 'pre-push', [...MISSING, later.file]), []);

  // the CLI reads approvedFiles from the arming file; absent or malformed list approves nothing
  const dir = mkdtempSync(join(tmpdir(), 'approved-'));
  try {
    const ledgerFile = join(dir, 'ledger.txt');
    writeFileSync(ledgerFile, toText(repairedLedger().filter((e) => !MISSING.some((f) => f.slice(0, 14) === e.version))));
    const write = (name, body) => { const f = join(dir, name); writeFileSync(f, JSON.stringify({ armed: true, projectRef: map.prodProjectRef, ...body })); return f; };
    const run = (armedFile) => main(['--ledger', ledgerFile, '--mode', 'pre-push', '--armed-file', armedFile], capture());
    assert.equal(run(write('both.json', { approvedFiles: MISSING })), 0);
    assert.equal(run(write('one.json', { approvedFiles: [MISSING[0]] })), 1);
    assert.equal(run(write('none.json', {})), 1);
    assert.equal(run(write('bad.json', { approvedFiles: 'all' })), 1);
    assert.throws(() => run(join(dir, 'absent.json')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('report mode fails on a ledger row with no file, so the post-push check cannot pass over drift', () => {
  const ledger = [...repairedLedger(), { version: '99999999999999', name: 'unknown' }];
  const drift = computeDrift({ files, ledger, map });
  assert.deepEqual(drift.orphans, ['99999999999999']);
  assert.ok(verdict(drift, 'report').some((w) => w.includes('99999999999999')));
  const dir = mkdtempSync(join(tmpdir(), 'orphan-'));
  try {
    const f = join(dir, 'ledger.txt');
    writeFileSync(f, toText(ledger));
    assert.equal(main(['--ledger', f, '--mode', 'report'], capture()), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the committed arming file carries an approvedFiles list', () => {
  const armed = JSON.parse(readFileSync(join(ROOT, 'scripts/db/production-apply.json'), 'utf8'));
  assert.ok(Array.isArray(armed.approvedFiles));
});

test('lint refuses a file mapped twice (the later entry would silently win)', () => {
  const problems = lintMigrations(files, { ...map, mapped: [...map.mapped, { file: map.mapped[0].file, ledgerVersion: '20990101000001' }] });
  assert.ok(problems.some((p) => p === `map: ${map.mapped[0].file} is mapped more than once`));
});

test('a held file verified missing in production has a documented, working path to being applied', () => {
  const target = '20260807010000_founder_chat_threads';
  const repaired = repairedLedger().filter((e) => e.version !== target.slice(0, 14));
  const stillHeld = computeDrift({ files, ledger: repaired, map });
  assert.deepEqual(stillHeld.held, [target]);
  assert.ok(verdict(stillHeld, 'pre-push').length > 0, 'while held, db push is blocked');

  const released = { ...map, held: map.held.filter((h) => h.file !== target) };
  const drift = computeDrift({ files, ledger: repaired, map: released });
  assert.deepEqual(drift.unapplied, [target]);
  assert.deepEqual(verdict(drift, 'pre-push'), [], 'after the reviewed map change, pre-push passes and db push applies it');

  const plan = repairPlan(computeDrift({ files, ledger: todayLedger, map }), map, files);
  assert.match(plan, /remove its entry from "held" in scripts\/db\/migration-ledger-map\.json/);
});

// ── The workflow ────────────────────────────────────────────────────────────
//
// Allow-lists, not deny-lists: the contract names the exact expressions and commands that are approved,
// so a new network-capable command or an inverted condition fails because it is not on the list.

const SHA_RE = /^[^@\s]+@[0-9a-f]{40}$/;
const PROD_IF = "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'";
const PR_IF = "github.event_name == 'pull_request'";
const SECRET_NAMES = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'];
const APPROVED_USES = ['actions/checkout', 'actions/setup-node', 'supabase/setup-cli'];
const PR_ALLOWED_COMMANDS = [
  'node --test scripts/__tests__/migration-drift.test.mjs',
  'node scripts/db/migration-drift.mjs --lint',
  'if [ ! -f apps/web/supabase/config.toml ]; then',
  'supabase init --workdir apps/web',
  'fi',
  'supabase start --workdir apps/web',
  'supabase db lint --local --workdir apps/web --level error > db-lint.txt 2>&1 || { cat db-lint.txt; exit 1; }',
  'node scripts/db/migration-drift.mjs --db-lint db-lint.txt',
  'supabase migration list --local --workdir apps/web > local-ledger.txt',
  'node scripts/db/migration-drift.mjs --ledger local-ledger.txt --mode report',
  'supabase stop --no-backup --workdir apps/web',
];

/** Structural findings about the workflow text. Empty means it satisfies the contract. */
export function workflowProblems(source) {
  const problems = [];
  const s = readWorkflowStructure(source);
  for (const job of s.jobs) {
    for (const step of job.steps) {
      if (!step.uses) continue;
      if (!SHA_RE.test(step.uses)) problems.push(`${job.name}: action not pinned to a full SHA: ${step.uses}`);
      if (!APPROVED_USES.includes(step.uses.split('@')[0])) problems.push(`${job.name}: action not on the approved list: ${step.uses}`);
    }
  }
  const pr = s.jobs.find((j) => j.name === 'pr-dry-run');
  const prod = s.jobs.find((j) => j.name === 'apply-production');
  if (!pr || !prod || s.jobs.length !== 2) return [...problems, 'expected exactly the jobs pr-dry-run and apply-production'];

  // Pull-request job: exact condition, no secrets anywhere, and only approved local commands.
  if (pr.raw.if !== PR_IF) problems.push(`pr-dry-run condition must be exactly: ${PR_IF}`);
  if (pr.raw.environment !== undefined) problems.push('pr-dry-run must not use an environment');
  if (/secrets\./.test(JSON.stringify(pr.raw))) problems.push('pr-dry-run must not reference secrets');
  for (const command of executedCommands(pr)) {
    if (!PR_ALLOWED_COMMANDS.includes(command)) problems.push(`pr-dry-run runs a command that is not on the approved local list: ${command}`);
  }

  // Production job: exact condition, gated environment, secrets only on steps, never on the job.
  if (prod.raw.if !== PROD_IF) problems.push(`apply-production condition must be exactly: ${PROD_IF}`);
  if (prod.raw.environment !== 'production-db') problems.push('apply-production must run in the production-db environment');
  const mapRef = JSON.parse(readFileSync(MAP_PATH, 'utf8')).prodProjectRef;
  if (prod.raw.env?.PROD_PROJECT_REF !== mapRef) problems.push('PROD_PROJECT_REF must equal prodProjectRef in the ledger map');
  if (/secrets\./.test(JSON.stringify(prod.raw.env ?? {}))) problems.push('secrets must be given to steps, not to the job');
  for (const name of [...source.matchAll(/secrets\.([A-Za-z_]+)/g)].map((m) => m[1])) {
    if (!SECRET_NAMES.includes(name)) problems.push(`unexpected secret ${name}`);
  }
  for (const step of prod.steps.filter((st) => st.uses)) {
    if (/secrets\./.test(JSON.stringify(step))) problems.push(`secret given to an action: ${step.uses}`);
  }

  const steps = prod.steps;
  const idx = (re) => steps.findIndex((st) => st.run && re.test(st.run));
  const found = {
    arming: idx(/--require-armed/),
    secrets: idx(/Missing secret/),
    link: idx(/supabase link/),
    ledger: idx(/migration list --linked/),
    identity: idx(/--identity/),
    plan: idx(/--mode pre-push/),
    dry: idx(/db push[^\n]*--dry-run/),
    apply: steps.findIndex((st) => st.run && /db push/.test(st.run) && !/--dry-run/.test(st.run)),
    after: idx(/--mode report/),
  };
  for (const [label, i] of Object.entries(found)) if (i === -1) problems.push(`apply-production lacks the ${label} step`);
  if (Object.values(found).every((i) => i !== -1)) {
    const order = ['arming', 'secrets', 'link', 'ledger', 'identity', 'plan', 'dry', 'apply', 'after'].map((k) => found[k]);
    if (order.some((v, k) => k > 0 && v <= order[k - 1])) problems.push('apply-production steps are out of order: arming, secrets, link, ledger, identity, plan, dry run, apply, check');
    const firstCli = steps.findIndex((st) => st.uses?.startsWith('supabase/setup-cli'));
    if (found.arming > firstCli || found.secrets > firstCli) problems.push('arming and secrets checks must run before the Supabase CLI is installed');
  }
  const needSecrets = [found.secrets, found.link, found.ledger, found.dry, found.apply, found.after];
  for (const i of needSecrets) {
    if (i === -1) continue;
    const raw = prod.raw.steps[i];
    const names = Object.keys(raw.env ?? {});
    for (const n of SECRET_NAMES) if (!names.includes(n)) problems.push(`step "${raw.name}" is missing ${n}`);
  }
  if (steps.some((st) => st.run && /--no-verify|--yes\b|--force\b/.test(st.run))) problems.push('no confirmation bypass flags');
  return problems;
}

test('the workflow satisfies its contract (pinned SHAs, local-only PR job, exact conditions, arming, identity before apply)', () => {
  assert.deepEqual(workflowProblems(readFileSync(WORKFLOW, 'utf8')), []);
});

test('the workflow contract FAILS on planted defects (negative controls)', () => {
  const good = readFileSync(WORKFLOW, 'utf8');
  const mutations = {
    'an unpinned action': (t) => t.replace(/supabase\/setup-cli@[0-9a-f]{40}/, 'supabase/setup-cli@v1'),
    'an unapproved action': (t) => t.replace(/actions\/setup-node@[0-9a-f]{40}/, 'evil/setup-node@' + 'a'.repeat(40)),
    'no environment gate': (t) => t.replace('environment: production-db\n', ''),
    'a wrong project ref': (t) => t.replace('PROD_PROJECT_REF: lksfwktwtmyznckodsau', 'PROD_PROJECT_REF: xgqwfwqumliuguzhshwv'),
    'a secret on the PR job': (t) => t.replace('timeout-minutes: 30\n    steps:\n      - uses: actions/checkout', 'timeout-minutes: 30\n    env:\n      X: ${{ secrets.SUPABASE_DB_PASSWORD }}\n    steps:\n      - uses: actions/checkout'),
    'a secret on the production job': (t) => t.replace('PROD_PROJECT_REF: lksfwktwtmyznckodsau', 'PROD_PROJECT_REF: lksfwktwtmyznckodsau\n      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}'),
    'a remote push on the PR job': (t) => t.replace('supabase start --workdir apps/web', 'supabase db push --linked'),
    'a curl write on the PR job': (t) => t.replace('supabase start --workdir apps/web', 'curl -sSf https://example.invalid/write -d @apps/web/supabase/migrations/20261105040000_gates_schema.sql'),
    'an extra secret': (t) => t.replace('${{ secrets.SUPABASE_DB_PASSWORD }}', '${{ secrets.OTHER_TOKEN }}'),
    'apply before the identity proof': (t) => t.replace('Prove this is the production database', 'Apply early').replace('node scripts/db/migration-drift.mjs --ledger prod-ledger.txt --identity apps/web/supabase/.temp/project-ref', 'supabase db push --linked --include-all'),
    'no arming step': (t) => t.replace('node scripts/db/migration-drift.mjs --require-armed', 'echo skipped'),
    'production on any ref': (t) => t.replace(PROD_IF, "github.event_name != 'pull_request'"),
    'production condition OR-ed with pull_request': (t) => t.replace(PROD_IF, `github.event_name == 'pull_request' || github.ref == 'refs/heads/main'`),
    'production condition inverted': (t) => t.replace("github.ref == 'refs/heads/main'", "github.ref != 'refs/heads/main'"),
    'a force flag': (t) => t.replace('--include-all --skip-vault --workdir', '--include-all --force --skip-vault --workdir'),
  };
  for (const [label, mutate] of Object.entries(mutations)) {
    const mutated = mutate(good);
    assert.notEqual(mutated, good, `mutation "${label}" did not change the workflow`);
    assert.ok(workflowProblems(mutated).length > 0, `a workflow with ${label} must be rejected`);
  }
});

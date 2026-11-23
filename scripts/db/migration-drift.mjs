#!/usr/bin/env node
/**
 * Migration drift check (UNI-2757).
 *
 * WHY. Migration files reached `main` and the deployed code, but never reached the production
 * database, and nothing noticed: the ledger versions in production differ from the file versions
 * (migrations were once applied by hand), so "is every file applied?" could not be answered by
 * comparing names. This script is the one place that answers it. The workflow, the repair plan and
 * the tests all call it; none of them re-implements the comparison.
 *
 * FAIL CLOSED. A ledger that cannot be read, or reads as empty, exits 2. An empty production
 * ledger would otherwise look like "every file is unapplied" or, worse, like "no drift".
 *
 * It never touches a database. It reads a ledger (text from `supabase migration list`, a JSON array,
 * or `version name` lines) and the migration files on disk.
 *
 * Exit codes: 0 clean, 1 drift or a blocker found, 2 unreadable input or bad usage.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const FILE_RE = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const VERSION_RE = /^\d{3,14}$/;
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;]*m/g;

export class DriftInputError extends Error {}

/** Reads a ledger in any supported shape. Throws DriftInputError when nothing usable is found. */
export function parseLedger(text) {
  const raw = String(text ?? '').replace(ANSI_RE, '').trim();
  if (!raw) throw new DriftInputError('ledger is empty: refusing to treat an unreadable read as an empty ledger');
  const entries = [];
  if (raw.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new DriftInputError(`ledger JSON does not parse: ${e.message}`);
    }
    for (const item of parsed) {
      if (typeof item === 'string') entries.push(splitVersionName(item));
      else if (item && typeof item === 'object') {
        const version = item.version ?? item.remote ?? null;
        if (version) entries.push({ version: String(version).trim(), name: item.name ?? null });
      }
    }
  } else if (raw.includes('|')) {
    for (const line of raw.split('\n')) {
      if (!line.includes('|') || /^[\s|+-]+$/.test(line) || /\blocal\b.*\bremote\b/i.test(line)) continue;
      const cols = line.split('|').map((c) => c.trim());
      if (cols[1]) entries.push({ version: cols[1], name: null });
    }
  } else {
    for (const line of raw.split('\n')) {
      if (line.trim()) entries.push(splitVersionName(line.trim()));
    }
  }
  for (const e of entries) {
    if (!VERSION_RE.test(e.version)) throw new DriftInputError(`ledger entry is not a migration version: ${JSON.stringify(e.version)}`);
  }
  if (entries.length === 0) throw new DriftInputError('ledger parsed to zero entries: refusing to continue');
  return entries;
}

function splitVersionName(line) {
  const i = line.indexOf(' ');
  return i === -1 ? { version: line, name: null } : { version: line.slice(0, i), name: line.slice(i + 1).trim() };
}

export function loadMap(path) {
  const map = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of ['prodProjectRef', 'migrationsDir', 'identitySentinels', 'mapped', 'held']) {
    if (map[key] === undefined) throw new DriftInputError(`ledger map is missing "${key}"`);
  }
  return map;
}

export function listMigrationFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;
    const m = FILE_RE.exec(entry.name);
    const sql = readFileSync(join(dir, entry.name), 'utf8');
    files.push(m ? { file: entry.name.slice(0, -4), version: m[1], name: m[2], valid: true, sql } : { file: entry.name.slice(0, -4), valid: false, sql });
  }
  return files.sort((a, b) => a.file.localeCompare(b.file));
}

const DO_BLOCK_RE = /\bdo\s+(\$[A-Za-z_]*\$)([\s\S]*?)\1/gi;
// Single-quoted strings and comments, blanked before scanning (newlines kept so line numbers hold).
const NOISE_RE = /'(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\//g;
// Every relation a statement reads or touches: FROM x, JOIN x (a function call such as unnest( is not a relation).
const RELATION_RE = /\b(?:from|join)\s+((?:"?[A-Za-z_][\w$]*"?\s*\.\s*)?"?[A-Za-z_][\w$]*"?)(?!\s*\()/gi;
// RAISE at any level that aborts: EXCEPTION, the bare-message form (defaults to EXCEPTION), SQLSTATE, USING, or a re-raise.
const ABORTING_RAISE_RE = /\braise\b(?!\s+(?:debug|log|info|notice|warning)\b)/i;
// The empty-database skip: a non-aborting RAISE followed directly by RETURN.
const SKIP_RE = /\braise\s+(?:debug|log|info|notice|warning)\b[^;]*;\s*return\s*;/i;

function isCatalog(relation) {
  const parts = relation.replace(/["\s]/g, '').toLowerCase().split('.');
  const schema = parts.length > 1 ? parts[0] : null;
  if (schema === 'pg_catalog' || schema === 'information_schema') return true;
  return schema === null && parts[0].startsWith('pg_');
}

/**
 * Replay rule: the history must apply to an EMPTY database (the PR job does exactly that).
 * A top-level DO block that reads any non-catalog relation is a data seed or a data check. On an
 * empty database those rows are always missing, so such a block must skip with a NOTICE and
 * return BEFORE any aborting RAISE. An aborting RAISE after that skip only runs on a populated
 * database (a conflict guard) and is allowed. Schema guards that read only the catalog (pg_* or information_schema) and
 * RAISE inside function bodies (run later, at call time) are not affected.
 * Returns a list of problems for one file's SQL.
 */
export function replayBlockers(sql) {
  const text = sql.replace(NOISE_RE, (s) => s.replace(/[^\n]/g, ' '));
  const problems = [];
  for (const m of text.matchAll(DO_BLOCK_RE)) {
    const body = m[2];
    const reads = [...body.matchAll(RELATION_RE)].map((r) => r[1]).filter((r) => !isCatalog(r));
    const abort = body.search(ABORTING_RAISE_RE);
    const skip = body.search(SKIP_RE);
    if (reads.length && abort !== -1 && (skip === -1 || skip > abort)) {
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(`DO block at line ${line} reads ${reads[0]} and can RAISE at an aborting level before any NOTICE-and-RETURN skip; on an empty database it must skip first, so the history replays`);
    }
  }
  return problems;
}

/** Static checks on the file set and the map. Returns a list of problems (empty means clean). */
export function lintMigrations(files, map) {
  const problems = [];
  const seen = new Map();
  for (const f of files) {
    if (!f.valid) {
      problems.push(`${f.file}.sql: name must match <14-digit version>_<lower_snake_name>.sql`);
      continue;
    }
    if (seen.has(f.version)) problems.push(`${f.file}.sql: version ${f.version} is also used by ${seen.get(f.version)}.sql`);
    seen.set(f.version, f.file);
    if (typeof f.sql === 'string') for (const p of replayBlockers(f.sql)) problems.push(`${f.file}.sql: ${p}`);
  }
  const names = new Set(files.map((f) => f.file));
  const claimed = new Map();
  const mappedOnce = new Set();
  for (const m of map.mapped) {
    if (!names.has(m.file)) problems.push(`map: mapped file ${m.file} does not exist`);
    if (mappedOnce.has(m.file)) problems.push(`map: ${m.file} is mapped more than once`);
    mappedOnce.add(m.file);
    if (seen.has(m.ledgerVersion)) problems.push(`map: ledger version ${m.ledgerVersion} is also a real file version`);
    if (claimed.has(m.ledgerVersion)) problems.push(`map: ledger version ${m.ledgerVersion} is claimed by ${claimed.get(m.ledgerVersion)} and ${m.file}`);
    claimed.set(m.ledgerVersion, m.file);
  }
  const mappedFiles = new Set(map.mapped.map((m) => m.file));
  for (const h of map.held) {
    if (!names.has(h.file)) problems.push(`map: held file ${h.file} does not exist`);
    if (mappedFiles.has(h.file)) problems.push(`map: ${h.file} is both mapped and held`);
  }
  return problems;
}

/**
 * Classifies every file against the ledger.
 *  applied        ledger holds the file's own version
 *  mappedApplied  the map says it was applied under another version, and the ledger holds that version
 *  held           not in the ledger; the map says it must not be applied unreviewed (db push WOULD apply it)
 *  unapplied      not in the ledger and not held: what `supabase db push` will apply
 *  orphans        ledger versions with no file of that version; `supabase db push` refuses to run while any exist
 */
export function computeDrift({ files, ledger, map }) {
  const ledgerVersions = new Set(ledger.map((e) => e.version));
  const mapByFile = new Map(map.mapped.map((m) => [m.file, m]));
  const heldFiles = new Map(map.held.map((h) => [h.file, h]));
  const valid = files.filter((f) => f.valid);
  const result = { applied: [], mappedApplied: [], held: [], unapplied: [], orphans: [] };
  for (const f of valid) {
    const mapped = mapByFile.get(f.file);
    if (ledgerVersions.has(f.version)) result.applied.push(f.file);
    else if (mapped && ledgerVersions.has(mapped.ledgerVersion)) result.mappedApplied.push(f.file);
    else if (heldFiles.has(f.file)) result.held.push(f.file);
    else result.unapplied.push(f.file);
  }
  const fileVersions = new Set(valid.map((f) => f.version));
  result.orphans = [...ledgerVersions].filter((v) => !fileVersions.has(v)).sort();
  return result;
}

/**
 * Why a mode fails. Empty list means pass.
 * `approved` (pre-push only) is the list of files the reviewed production-apply.json names for this
 * apply. When given, every file db push would apply must be on it, so arming once never approves a
 * migration merged later: each new file needs its own reviewed, human-merged approval.
 */
export function verdict(drift, mode, approved = null) {
  const why = [];
  if (mode === 'pre-push') {
    for (const f of drift.held) why.push(`held file would be applied unreviewed by db push: ${f}`);
    if (approved !== null) {
      const ok = new Set(approved);
      for (const f of drift.unapplied) if (!ok.has(f)) why.push(`not approved for this apply: ${f} is not listed in production-apply.json approvedFiles`);
    }
    if (drift.orphans.length) why.push(`${drift.orphans.length} ledger version(s) have no file; db push refuses to run until they are repaired (see repair-plan.sh)`);
  } else {
    for (const f of drift.unapplied) why.push(`not applied: ${f}`);
    for (const f of drift.held) why.push(`held and not applied: ${f}`);
    if (drift.orphans.length) why.push(`${drift.orphans.length} ledger version(s) have no file: ${drift.orphans.slice(0, 5).join(', ')}${drift.orphans.length > 5 ? ', ...' : ''}`);
  }
  return why;
}

/**
 * Ledger-only repair commands. Prints text; nothing here runs them.
 *
 * Orphans are split by provenance. A "replaced" orphan is the old ledger version of a file in the map:
 * its replacement is known, so reverting it loses nothing. A "legacy" orphan has no file and no
 * replacement in this repository (early numbered migrations, repair replays, backups). Reverting one
 * deletes real history, so it is printed as a separate decision with a backup step, never as part of
 * the routine plan. `supabase db push` refuses to run while either kind exists.
 */
export function repairPlan(drift, map, files, ledger = []) {
  const problems = lintMigrations(files, map);
  if (problems.length) throw new DriftInputError(`refusing to print a repair plan from an inconsistent map: ${problems.join('; ')}`);
  const versionOf = new Map(files.filter((f) => f.valid).map((f) => [f.file, f.version]));
  const mappedByFile = new Map(map.mapped.map((m) => [m.file, m]));
  const replacedVersions = new Set(drift.mappedApplied.map((f) => mappedByFile.get(f).ledgerVersion));
  const toApply = drift.mappedApplied.map((f) => versionOf.get(f));
  const replaced = drift.orphans.filter((v) => replacedVersions.has(v));
  const legacy = drift.orphans.filter((v) => !replacedVersions.has(v));
  const nameOf = new Map(ledger.map((e) => [e.version, e.name]));
  const cmd = (status, versions) => `supabase migration repair --workdir apps/web --linked --status ${status} ${versions.join(' ')}`;
  const lines = [
    '# Ledger-only repair for the production database. These commands change the migration history table, never the schema.',
    '# Printed by scripts/db/migration-drift.mjs --repair-plan. Nothing here has been run.',
  ];
  if (toApply.length) {
    lines.push('', `# 1. Record ${toApply.length} hand-applied file(s) under their own file version:`, cmd('applied', toApply));
    for (const f of drift.mappedApplied) lines.push(`#    ${versionOf.get(f)} ${f.slice(15)} (was recorded as ${mappedByFile.get(f).ledgerVersion})`);
  }
  if (replaced.length) {
    lines.push('', `# 2. Remove the ${replaced.length} old ledger row(s) that step 1 replaces. Each has a known replacement above; nothing is lost.`, cmd('reverted', replaced));
  }
  if (legacy.length) {
    lines.push('', `# 3. DECISION NEEDED. ${legacy.length} ledger row(s) have no file and no replacement in this repository (early numbered migrations, repair replays, backups).`,
      '#    `supabase db push` refuses to run while they exist, and it has no option to skip them. Removing them deletes real migration history',
      '#    (the schema is untouched). Do this only after saving the history:',
      '#      select version, name from supabase_migrations.schema_migrations order by version;   -- Supabase SQL editor, export the result and keep it',
      '#    The rows, with names, as read on 23/11/2026 are committed in scripts/db/__fixtures__/prod-ledger-2026-11-23.txt.',
      cmd('reverted', legacy));
    for (const v of legacy.filter((x) => nameOf.get(x))) lines.push(`#    ${v} ${nameOf.get(v)}`);
  }
  if (drift.held.length) {
    lines.push('', '# 4. Held files. Do NOT run these blindly. For each, check read-only whether its objects exist in production.',
      '#    Exists: record it with `supabase migration repair ... --status applied <version>`.',
      '#    Missing: remove its entry from "held" in scripts/db/migration-ledger-map.json in a reviewed change; db push then applies it.');
    for (const f of drift.held) {
      const h = map.held.find((x) => x.file === f);
      lines.push(`#    ${f} [${h.kind}]: ${h.reason}`);
    }
  }
  if (!toApply.length && !replaced.length && !legacy.length && !drift.held.length) lines.push('', '# Nothing to repair.');
  return lines.join('\n');
}

/** The repository arming switch: a committed file only a reviewed, human-merged change can flip. */
export function checkArmed({ armed, map }) {
  const why = [];
  if (!armed || typeof armed !== 'object') why.push('production-apply.json is unreadable: refusing to apply');
  else {
    if (armed.armed !== true) why.push('production apply is not armed: scripts/db/production-apply.json has "armed": false');
    if (armed.projectRef !== map.prodProjectRef) why.push('production-apply.json projectRef does not match the ledger map');
  }
  return why;
}

/** Production identity: the linked project ref and the ledger history must match what this repo expects. */
export function checkIdentity({ linkedRef, ledger, map }) {
  const why = [];
  if (!linkedRef) why.push('no linked project ref was read: refusing to guess which database this is');
  else if (linkedRef.trim() !== map.prodProjectRef) why.push(`linked project ref ${linkedRef.trim()} is not the production ref in the ledger map`);
  const have = new Set(ledger.map((e) => e.version));
  for (const s of map.identitySentinels) if (!have.has(s)) why.push(`ledger lacks identity sentinel ${s}: this does not look like the Unite-Group production history`);
  return why;
}

function parseArgs(argv) {
  const args = { mode: 'report', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new DriftInputError(`${a} needs a value`);
      i += 1;
      return argv[i];
    };
    if (a === '--ledger') args.ledger = next();
    else if (a === '--map') args.map = next();
    else if (a === '--dir') args.dir = next();
    else if (a === '--armed-file') args.armedFile = next();
    else if (a === '--mode') args.mode = next();
    else if (a === '--identity') args.identity = next();
    else if (a === '--json') args.json = true;
    else if (a === '--lint') args.lint = true;
    else if (a === '--repair-plan') args.repairPlan = true;
    else if (a === '--require-armed') args.requireArmed = true;
    else throw new DriftInputError(`unknown argument ${a}`);
  }
  if (!['report', 'pre-push'].includes(args.mode)) throw new DriftInputError(`unknown mode ${args.mode}`);
  return args;
}

export function main(argv, out = console) {
  const args = parseArgs(argv);
  const map = loadMap(args.map ?? join(HERE, 'migration-ledger-map.json'));
  const files = listMigrationFiles(args.dir ?? join(ROOT, map.migrationsDir));
  if (files.length === 0) throw new DriftInputError('no migration files found: refusing to report a clean state from an empty directory');
  const problems = lintMigrations(files, map);
  if (args.lint) {
    for (const p of problems) out.error(`lint: ${p}`);
    out.log(problems.length ? `lint: ${problems.length} problem(s)` : `lint: ${files.length} migration file(s) clean`);
    return problems.length ? 1 : 0;
  }
  if (args.requireArmed) {
    const armed = JSON.parse(readFileSync(args.armedFile ?? join(HERE, 'production-apply.json'), 'utf8'));
    const why = checkArmed({ armed, map });
    for (const w of why) out.error(`armed: ${w}`);
    out.log(why.length ? 'armed: NO' : 'armed: yes');
    return why.length ? 1 : 0;
  }
  if (!args.ledger) throw new DriftInputError('--ledger <file> is required');
  const ledger = parseLedger(readFileSync(args.ledger, 'utf8'));
  if (args.identity) {
    const linkedRef = readFileSync(args.identity, 'utf8');
    const why = checkIdentity({ linkedRef, ledger, map });
    for (const w of why) out.error(`identity: ${w}`);
    out.log(why.length ? 'identity: FAILED' : `identity: OK (project ref ${map.prodProjectRef}, ${map.identitySentinels.length} sentinels present)`);
    return why.length ? 1 : 0;
  }
  if (problems.length) {
    for (const p of problems) out.error(`lint: ${p}`);
    return 1;
  }
  const drift = computeDrift({ files, ledger, map });
  if (args.repairPlan) {
    out.log(repairPlan(drift, map, files, ledger));
    return 0;
  }
  let approved = null;
  if (args.mode === 'pre-push') {
    // Fail closed: an unreadable file throws; a missing or malformed list approves nothing.
    const armed = JSON.parse(readFileSync(args.armedFile ?? join(HERE, 'production-apply.json'), 'utf8'));
    approved = Array.isArray(armed?.approvedFiles) ? armed.approvedFiles.filter((f) => typeof f === 'string') : [];
  }
  const why = verdict(drift, args.mode, approved);
  if (args.json) out.log(JSON.stringify({ mode: args.mode, ok: why.length === 0, why, ...drift }, null, 2));
  else {
    out.log(`files ${files.length}: applied ${drift.applied.length}, applied under another version ${drift.mappedApplied.length}, held ${drift.held.length}, unapplied ${drift.unapplied.length}, ledger orphans ${drift.orphans.length}`);
    if (args.mode === 'pre-push') for (const f of drift.unapplied) out.log(`will apply: ${f}`);
    for (const w of why) out.error(`DRIFT: ${w}`);
    out.log(why.length ? `${args.mode}: FAILED` : `${args.mode}: OK`);
  }
  return why.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    if (e instanceof DriftInputError || e.code === 'ENOENT') {
      console.error(`migration-drift: ${e.message}`);
      process.exitCode = 2;
    } else throw e;
  }
}

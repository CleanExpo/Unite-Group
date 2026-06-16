#!/usr/bin/env node
// RestoreAssist Production-Readiness Loop runner.
//
// Reads the gate registry, evaluates every gate, prints a gap report, and exits 0
// ONLY when zero blockers AND zero majors remain open in the selected tier. That
// exit code is the "loop-until-done" contract (spec §5 / §7): wrap this in /loop or
// a cron and the loop terminates exactly when the product clears the chosen bar.
//
//   node scripts/readiness-loop.mjs                  # tier=production (full bar)
//   node scripts/readiness-loop.mjs --tier=pilot     # pilot bar (first real job)
//   TARGET_REPO=/path/to/Unite-Hub node scripts/readiness-loop.mjs   # run command checks live
//   node scripts/readiness-loop.mjs --tier=pilot --json              # machine output
//
// Tiers (Item 1): a gate's tier is `tier` in the registry, defaulting to "pilot".
//   --tier=pilot       counts only pilot gates toward "done"; production-only gates show as deferred.
//   --tier=production  counts ALL gates (the full owned/surge-ready bar). Default.
//
// Check kinds:
//   command     -> runs check.run in $TARGET_REPO; exit 0 = pass
//   gap-scan    -> same, used for §3 enumeration checks
//   attestation -> reads a signed sign-off from readiness-state.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REG = process.env.GATES_FILE || resolve(ROOT, 'docs/plans/restoreassist/readiness-gates.json');
const STATE = process.env.STATE_FILE || resolve(ROOT, 'docs/plans/restoreassist/readiness-state.json');
const TARGET = process.env.TARGET_REPO || null;
const asJson = process.argv.includes('--json');
const tierArg = process.argv.find((a) => a.startsWith('--tier='));
const TIER = tierArg ? tierArg.split('=')[1] : 'production'; // 'pilot' | 'production'
if (!['pilot', 'production'].includes(TIER)) {
  console.error(`Invalid tier '${TIER}'. Expected --tier=pilot or --tier=production.`);
  process.exit(2);
}

const C = { reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', cyan: '\x1b[36m', bold: '\x1b[1m' };
const paint = (s, c) => (process.stdout.isTTY ? c + s + C.reset : s);

const reg = JSON.parse(readFileSync(REG, 'utf8'));
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { attestations: {}, runs: [] };
const att = state.attestations || {};

function evalGate(g) {
  const c = g.check || {};
  if (c.kind === 'command' || c.kind === 'gap-scan') {
    if (!TARGET) return { status: 'open', reason: 'TARGET_REPO not set — check unevaluated' };
    try {
      execSync(c.run, { cwd: TARGET, stdio: 'ignore', timeout: c.timeout_ms || 600000, shell: '/bin/bash' });
      return { status: 'pass' };
    } catch {
      return { status: 'fail', reason: `non-zero: ${c.run}` };
    }
  }
  if (c.kind === 'attestation') {
    const a = att[c.attestation_key];
    if (a && a.signed === true) return { status: 'pass', reason: `attested by ${a.by || '?'} (${a.date || '?'})` };
    return { status: 'open', reason: `attestation '${c.attestation_key}' unsigned` };
  }
  return { status: 'open', reason: `unknown check kind '${c.kind}'` };
}

const results = reg.gates.map((g) => ({ ...g, _tier: g.tier || 'pilot', result: evalGate(g) }));
const inScope = (r) => TIER === 'production' || r._tier === 'pilot';
const scoped = results.filter(inScope);
const deferred = results.filter((r) => !inScope(r));
const passing = scoped.filter((r) => r.result.status === 'pass');
const open = scoped.filter((r) => r.result.status !== 'pass');
const bySev = (s) => open.filter((r) => r.severity === s);
const blockers = bySev('blocker'), majors = bySev('major'), minors = bySev('minor');
const done = blockers.length === 0 && majors.length === 0;

// Record this pass (last 50). new Date() is fine — this is a normal Node script.
state.runs = (state.runs || []).slice(-49);
state.runs.push({ at: new Date().toISOString(), tier: TIER, target: TARGET || null, total: results.length, in_scope: scoped.length, passing: passing.length, blockers: blockers.length, majors: majors.length, minors: minors.length, done });
writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');

if (asJson) {
  console.log(JSON.stringify({
    product: reg.meta.product, tier: TIER, done, target_repo: TARGET || null,
    summary: { total: results.length, in_scope: scoped.length, deferred_to_production: deferred.length, passing: passing.length, open: open.length, blockers: blockers.length, majors: majors.length, minors: minors.length },
    gaps: open.map((r) => ({ id: r.id, phase: r.phase, title: r.title, severity: r.severity, tier: r._tier, owner: r.owner, consequential: !!r.consequential, reason: r.result.reason }))
  }, null, 2));
  process.exit(done ? 0 : 1);
}

const sevTag = (s) => s === 'blocker' ? paint('BLOCKER', C.red) : s === 'major' ? paint('MAJOR', C.yellow) : paint('minor', C.dim);
console.log('');
console.log(paint(`  ${reg.meta.product} — Production-Readiness Loop  [tier: ${TIER}]`, C.bold));
console.log(paint(`  done rule: zero open blockers + majors in the ${TIER} tier`, C.dim));
console.log(paint(`  target repo: ${TARGET || '(none — command checks unevaluated; set TARGET_REPO)'}`, C.dim));
console.log('');
console.log(`  Gates passing: ${paint(`${passing.length}/${scoped.length}`, done ? C.green : C.cyan)}    open: ${open.length}  (${paint(blockers.length + ' blocker', C.red)}, ${paint(majors.length + ' major', C.yellow)}, ${minors.length} minor)${deferred.length ? paint(`    deferred to production: ${deferred.length}`, C.dim) : ''}`);
console.log('');
if (open.length) {
  console.log(paint('  OPEN GAPS (ticket-ready for Linear team UNI — §3):', C.bold));
  for (const sev of ['blocker', 'major', 'minor']) {
    for (const r of bySev(sev)) {
      console.log(`   [${sevTag(sev)}] ${paint(r.id, C.cyan)} — ${r.title}`);
      console.log(paint(`        ${r.phase} · owner ${r.owner}${r.consequential ? ' · §4 CONSEQUENTIAL' : ''} · ${r.result.reason}`, C.dim));
    }
  }
  console.log('');
}
console.log(done
  ? paint(`  ✅ ${TIER.toUpperCase()} DONE — zero blockers, zero majors in scope.`, C.green)
  : paint(`  ⏳ ${TIER.toUpperCase()} NOT DONE — ${blockers.length} blocker(s) + ${majors.length} major(s) open. Loop continues.`, C.yellow));
console.log('');
process.exit(done ? 0 : 1);

#!/usr/bin/env node
/**
 * Preflight — run the CI gates that YOUR changes actually trip, locally,
 * before the push that spends money.
 *
 * WHY THIS EXISTS. Two separate cost surfaces sit downstream of a push, and
 * only one of them is free:
 *
 *   - GitHub Actions on this repo is FREE. Unite-Group is a public repository,
 *     and standard GitHub-hosted runners are unmetered on public repos on every
 *     plan. Re-running the matrix costs nothing but wall-clock. Do NOT trim CI
 *     coverage to "save minutes" — there are none to save.
 *   - Vercel is NOT free. Every push to a PR branch builds a preview; every
 *     merge to main builds production. That is where a rejected PR actually
 *     bills. `ignoreCommand` (scripts/vercel-ignore-build.mjs) skips the builds
 *     that cannot matter; this script stops the ones that would have failed.
 *
 * So the goal here is NOT "run less CI". It is: find the failure on the machine
 * you are already paying for, so the round trip that ends in a red check and a
 * burnt Vercel build never starts.
 *
 * WHAT IT RUNS. The job table in scripts/lib/preflight-jobs.mjs mirrors
 * .github/workflows/ci.yml one-to-one, and a test asserts it stays that way.
 * Cheap gates (seconds in CI) always run — path-scoping them buys nothing and
 * risks a miss. Expensive gates (the per-package verify:* chains) run only when
 * the change touches something they cover.
 *
 * The apps/web trigger set is wider than apps/web/. Its `prebuild` runs
 * sync-portfolio-registry.mjs and sync-capability-registry.mjs, which read
 * .portfolio/PORTFOLIO.yaml, .claude/agents, .claude/skills and .mcp.json from
 * the REPO ROOT. A change to any of those alters the build without touching a
 * single file under apps/web. Same table drives the Vercel ignore step, for the
 * same reason.
 *
 * Usage:
 *   node scripts/preflight.mjs              # gates your diff vs origin/main trips
 *   node scripts/preflight.mjs --list       # show what would run, run nothing
 *   node scripts/preflight.mjs --all        # every gate, ignore the diff
 *   node scripts/preflight.mjs --base <ref> # compare against a different base
 *   node scripts/preflight.mjs --keep-going # run all selected, don't stop at first red
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOBS, UNREPRODUCIBLE, jobMatches } from './lib/preflight-jobs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Arguments ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const listOnly = has('--list');
const runAll = has('--all');
const keepGoing = has('--keep-going');
const baseOverride = valueOf('--base');

// ── Change detection ─────────────────────────────────────────────────────────
function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function resolveBase() {
  if (baseOverride) return baseOverride;
  for (const ref of ['origin/main', 'main']) {
    if (git(['rev-parse', '--verify', '--quiet', ref], { allowFail: true })) return ref;
  }
  return null;
}

function changedFiles(base) {
  const set = new Set();
  if (base) {
    // Three-dot: what THIS branch changed since it diverged, not what main did.
    const mergeBase = git(['merge-base', base, 'HEAD'], { allowFail: true });
    const diff = git(['diff', '--name-only', `${mergeBase || base}...HEAD`], { allowFail: true });
    if (diff) diff.split('\n').filter(Boolean).forEach((f) => set.add(f));
  }
  // Uncommitted work counts — preflight is most useful BEFORE the commit.
  for (const args of [['diff', '--name-only'], ['diff', '--name-only', '--cached']]) {
    const out = git(args, { allowFail: true });
    if (out) out.split('\n').filter(Boolean).forEach((f) => set.add(f));
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard'], { allowFail: true });
  if (untracked) untracked.split('\n').filter(Boolean).forEach((f) => set.add(f));
  return [...set];
}

// ── Selection ────────────────────────────────────────────────────────────────
const base = resolveBase();
const files = runAll ? [] : changedFiles(base);

if (!runAll && files.length === 0) {
  console.log('Preflight: no changes detected vs %s — nothing to verify.', base || 'any base');
  console.log('Use --all to run every gate anyway.');
  process.exit(0);
}

const selected = JOBS.filter((j) => jobMatches(j, files, runAll));
const skipped = JOBS.filter((j) => !selected.includes(j));

console.log('─'.repeat(72));
console.log('PREFLIGHT — local CI mirror');
console.log('─'.repeat(72));
if (runAll) {
  console.log('Mode:    --all (every gate)');
} else {
  console.log(`Base:    ${base || '(none — comparing working tree only)'}`);
  console.log(`Changed: ${files.length} file(s)`);
}
console.log(`Running: ${selected.length} gate(s)`);
for (const j of selected) console.log(`   • ${j.label}`);
if (skipped.length) {
  console.log(`Skipped: ${skipped.length} gate(s) — nothing in the diff touches them`);
  for (const j of skipped) console.log(`   · ${j.label}`);
}
console.log('Not reproducible locally (CI will still run these):');
for (const [job, why] of Object.entries(UNREPRODUCIBLE)) console.log(`   ! ${job} — ${why}`);
console.log('─'.repeat(72));

if (listOnly) process.exit(0);

// ── Execution ────────────────────────────────────────────────────────────────
const results = [];
let failed = false;

for (const job of selected) {
  const [bin, args, cwd] = job.cmd;
  const wd = cwd ? resolve(repoRoot, cwd) : repoRoot;

  if (cwd && !existsSync(wd)) {
    console.log(`\n▸ ${job.label}\n  SKIPPED — ${cwd} not present`);
    results.push({ job, status: 'skipped' });
    continue;
  }

  console.log(`\n▸ ${job.label}`);
  const started = Date.now();
  const proc = spawnSync(bin, args, { cwd: wd, stdio: 'inherit', shell: false });
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  if (proc.error) {
    console.log(`  ERROR — could not run ${bin}: ${proc.error.message}`);
    results.push({ job, status: 'error', secs });
    failed = true;
  } else if (proc.status !== 0) {
    console.log(`  FAIL (${secs}s) — exit ${proc.status}`);
    results.push({ job, status: 'fail', secs });
    failed = true;
  } else {
    console.log(`  PASS (${secs}s)`);
    results.push({ job, status: 'pass', secs });
  }

  if (failed && !keepGoing) {
    console.log('\nStopping at first failure. Use --keep-going to run the rest.');
    break;
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(72)}`);
console.log('PREFLIGHT SUMMARY');
console.log('─'.repeat(72));
for (const r of results) {
  const mark = { pass: 'PASS', fail: 'FAIL', error: 'ERR ', skipped: 'SKIP' }[r.status];
  console.log(`  ${mark}  ${r.job.label}${r.secs ? ` (${r.secs}s)` : ''}`);
}
const notRun = selected.length - results.length;
if (notRun > 0) console.log(`  ....  ${notRun} gate(s) not reached`);

if (failed) {
  console.log('\nRED — do not push. Fix the above, then re-run preflight.');
  process.exit(1);
}
console.log('\nGREEN — safe to push.');
console.log('CI will additionally run: ' + Object.keys(UNREPRODUCIBLE).join(', ') + '.');
process.exit(0);

/**
 * Preflight coverage and correctness gates.
 *
 * The load-bearing test here is "every ci.yml job is accounted for". Preflight's
 * value is entirely a claim about CI — "green here means green there" — and that
 * claim decays the moment someone adds a CI job and forgets this table. A stale
 * preflight is worse than none: it green-lights a push, CI goes red, and the
 * Vercel preview build that failure rides along with has already been paid for.
 * So the drift fails a test rather than a pull request.
 *
 * The Vercel ignore-step tests guard the opposite asymmetry: skipping a build
 * that was needed leaves production serving stale code. Those tests pin the
 * fail-open behaviour so an "optimisation" cannot quietly invert it.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { JOBS, UNREPRODUCIBLE, jobMatches } from '../lib/preflight-jobs.mjs';
import { WEB_BUILD_INPUTS, affectsWebBuild } from '../lib/web-build-inputs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CI_PATH = resolve(repoRoot, '.github/workflows/ci.yml');

/**
 * Parse the top-level job ids out of ci.yml without a YAML dependency: they are
 * the two-space-indented `key:` lines inside the `jobs:` block. Deliberately
 * literal — a real YAML parser would be more code and another dependency in the
 * readiness kernel's stdlib-only lane.
 */
function ciJobIds() {
  const lines = readFileSync(CI_PATH, 'utf8').split('\n');
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  assert.notEqual(start, -1, 'ci.yml must declare a top-level `jobs:` block');
  const ids = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // dedented out of `jobs:`
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m) ids.push(m[1]);
  }
  return ids;
}

test('ci.yml parses to a plausible job list', () => {
  const ids = ciJobIds();
  assert.ok(ids.length >= 10, `expected >=10 ci.yml jobs, parsed ${ids.length}: ${ids.join(', ')}`);
  // Positive control: a job known to exist must be found. Without this the
  // parser could return garbage and the coverage test below would still pass
  // by comparing two empty-ish sets.
  assert.ok(ids.includes('web'), 'parser failed to find the `web` job');
});

test('every ci.yml job is either mirrored in preflight or explicitly unreproducible', () => {
  const covered = new Set([...JOBS.map((j) => j.ciJob), ...Object.keys(UNREPRODUCIBLE)]);
  const missing = ciJobIds().filter((id) => !covered.has(id));
  assert.deepEqual(
    missing,
    [],
    `ci.yml job(s) not represented in scripts/lib/preflight-jobs.mjs: ${missing.join(', ')}. ` +
      'Add a JOBS entry (with the command that reproduces it locally) or an UNREPRODUCIBLE entry ' +
      'explaining why it cannot run on a developer machine.',
  );
});

test('preflight declares no job that ci.yml does not have', () => {
  const ids = new Set(ciJobIds());
  const orphans = [...JOBS.map((j) => j.ciJob), ...Object.keys(UNREPRODUCIBLE)].filter((j) => !ids.has(j));
  assert.deepEqual(orphans, [], `preflight references non-existent ci.yml job(s): ${orphans.join(', ')}`);
});

test('cheap gates run unconditionally; expensive gates are path-scoped', () => {
  for (const job of JOBS) {
    const scoped = Boolean(job.paths?.length);
    assert.ok(
      job.always ? !scoped : scoped,
      `${job.id}: a job must be either always-run or path-scoped, never both or neither`,
    );
  }
});

test('an empty diff selects only the always-run gates', () => {
  const selected = JOBS.filter((j) => jobMatches(j, []));
  assert.ok(selected.length > 0, 'always-run gates must exist so a docs-only change still gets checked');
  assert.ok(selected.every((j) => j.always), 'no path-scoped gate may fire on an empty diff');
});

test('--all selects every gate', () => {
  assert.equal(JOBS.filter((j) => jobMatches(j, [], true)).length, JOBS.length);
});

test('changed paths select the expected gate', () => {
  const pick = (files) => JOBS.filter((j) => jobMatches(j, files)).map((j) => j.id);
  assert.ok(pick(['apps/web/src/app/page.tsx']).includes('web'));
  assert.ok(pick(['apps/workspace/src/main.tsx']).includes('workspace'));
  assert.ok(pick(['packages/spine/packages/spine/src/x.ts']).includes('spine'));
  assert.ok(!pick(['docs/brain/NEXUS.md']).includes('web'), 'a docs change must not trigger verify:web');
  assert.ok(pick(['apps/web/pnpm-lock.yaml']).includes('dependency-audit'), 'lockfiles match by basename');
});

// ── apps/web build-input surface ─────────────────────────────────────────────

test('repo-root prebuild inputs are treated as apps/web build inputs', () => {
  // These four are the reason the trigger set is wider than apps/web/. If a
  // refactor narrows it back to the directory, production starts serving a
  // stale portfolio/capability registry after an edit that Vercel skipped.
  for (const f of [
    '.portfolio/PORTFOLIO.yaml',
    '.claude/agents/reviewer.md',
    '.claude/skills/live-verify/SKILL.md',
    '.mcp.json',
  ]) {
    assert.ok(affectsWebBuild([f]), `${f} must count as an apps/web build input`);
  }
});

test('the declared prebuild inputs match what the sync scripts actually read', () => {
  // Guards the header claim rather than trusting it: if a sync script starts
  // reading a new repo-root path, this fails instead of silently widening the
  // set of edits Vercel would wrongly skip.
  const sources = ['sync-portfolio-registry.mjs', 'sync-capability-registry.mjs']
    .map((f) => readFileSync(resolve(repoRoot, 'apps/web/scripts', f), 'utf8'))
    .join('\n');
  for (const [needle, declared] of [
    ["'.portfolio'", '.portfolio/'],
    ["'.claude', 'agents'", '.claude/agents/'],
    ["'.claude', 'skills'", '.claude/skills/'],
    ["'.mcp.json'", '.mcp.json'],
  ]) {
    assert.ok(sources.includes(needle), `expected a sync script to read ${needle} — has the prebuild changed?`);
    assert.ok(WEB_BUILD_INPUTS.includes(declared), `${declared} must be declared in WEB_BUILD_INPUTS`);
  }
});

test('unrelated changes do not affect the apps/web build', () => {
  assert.equal(affectsWebBuild(['docs/convergence/runbook.md', 'apps/workspace/src/a.ts']), false);
});

// ── Vercel ignore step — fail-open contract ──────────────────────────────────
// Vercel's contract is inverted: exit 0 SKIPS the build, exit 1 BUILDS.

const IGNORE = resolve(repoRoot, 'scripts/vercel-ignore-build.mjs');
const SKIP = 0;
const BUILD = 1;

function runIgnore(env) {
  const r = execFileSync('node', [IGNORE], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    // Non-zero exit is the BUILD signal, not a failure — capture it.
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: 0, out: r };
}

function ignoreExitCode(env) {
  try {
    runIgnore(env);
    return SKIP;
  } catch (err) {
    return err.status;
  }
}

test('missing baseline SHA builds rather than skips', () => {
  assert.equal(
    ignoreExitCode({ VERCEL_GIT_PREVIOUS_SHA: '', VERCEL_GIT_COMMIT_SHA: 'HEAD' }),
    BUILD,
    'with no baseline the script cannot prove irrelevance, so it must build',
  );
});

test('a baseline SHA absent from the clone builds rather than skips', () => {
  assert.equal(
    ignoreExitCode({
      // Well-formed but non-existent object — the shallow-clone case.
      VERCEL_GIT_PREVIOUS_SHA: '0000000000000000000000000000000000000000',
      VERCEL_GIT_COMMIT_SHA: 'HEAD',
    }),
    BUILD,
    'an unresolvable baseline must build, never skip',
  );
});

test('a real range touching apps/web builds', () => {
  const sha = execFileSync(
    'git',
    ['log', '--format=%H', '-1', '--', 'apps/web'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  if (!sha) return; // no apps/web history in this checkout
  const parent = execFileSync('git', ['rev-parse', `${sha}^`], { cwd: repoRoot, encoding: 'utf8' }).trim();
  assert.equal(
    ignoreExitCode({ VERCEL_GIT_PREVIOUS_SHA: parent, VERCEL_GIT_COMMIT_SHA: sha }),
    BUILD,
    'a commit that changed apps/web must build',
  );
});

test('an identical range skips', () => {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  assert.equal(
    ignoreExitCode({ VERCEL_GIT_PREVIOUS_SHA: head, VERCEL_GIT_COMMIT_SHA: head }),
    SKIP,
    'an empty diff between two present commits has nothing to rebuild',
  );
});

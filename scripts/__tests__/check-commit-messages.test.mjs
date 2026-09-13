/**
 * Tests for the commit-message convention guard (UNI-2658).
 *
 * The convention (nexus-conventions) already said every subject carries a
 * Linear ref and every body ends with Gate:. Nothing checked. The instance
 * was 14bb3b60 on PR #1066 — a fast-uri bump whose subject omitted UNI-2640
 * and whose body omitted Gate:. These tests are the durable fix: a subject
 * without a ref, or a body without Gate:, must fail here before it can fail
 * silently on a PR again.
 *
 * Positive controls prove the happy path is accepted. Mutation / bypass
 * controls prove the defect class is rejected — a test never seen red is
 * not evidence (keeper-gate §4).
 */

import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LINEAR_TEAM_PREFIXES,
  extractLinearRef,
  hasGateLine,
  hasLinearRef,
  inspectCommit,
  inspectCommits,
  isMechanicalMerge,
  main,
  parseGitLog,
  resolveRange,
} from '../check-commit-messages.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CI_PATH = join(repoRoot, '.github', 'workflows', 'ci.yml');
const PREFLIGHT_PATH = join(repoRoot, 'scripts', 'lib', 'preflight-jobs.mjs');
const PACKAGE_PATH = join(repoRoot, 'package.json');

const HISTORICAL_SUBJECT =
  'fix(deps): bump fast-uri override to 4.1.4 across four lockfiles';

const VALID = {
  subject: 'feat(ci): enforce Linear refs and Gate lines (UNI-2658)',
  body: [
    'What cannot happen: a PR-range commit merges without a ticket ref.',
    '',
    'Gate: node --test scripts/__tests__/check-commit-messages.test.mjs PASS.',
  ].join('\n'),
};

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'commit-msg-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '--quiet', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  return { dir, git };
}

function commitFile(dir, git, { path = 'NOTE', content, message }) {
  writeFileSync(join(dir, path), content);
  git('add', path);
  git('commit', '--quiet', '-m', message);
  return git('rev-parse', 'HEAD').trim();
}

// ── Linear ref ──────────────────────────────────────────────────────────────

test('POSITIVE: accepted Linear-ref spellings on the subject', () => {
  for (const subject of [
    'feat(ci): add the guard (UNI-2658)',
    'fix(deps): bump fast-uri to 4.1.4 [UNI-2640]',
    'UNI-2673: governance evidence base',
    'chore(ra): seed the fixture (RA-1745)',
    'fix(sync): handle the webhook (syn-100)',
    'feat(ccw): turnstile (CCW-160)',
    'fix(dr): portal copy (DR-627)',
  ]) {
    assert.equal(hasLinearRef(subject), true, subject);
    assert.ok(extractLinearRef(subject), subject);
  }
});

test('MUTATION: the historical fast-uri subject has no Linear ref', () => {
  // Exact headline of 14bb3b60 — the UNI-2658 instance. If this ever passes,
  // the guard no longer catches the defect it was written for.
  assert.equal(hasLinearRef(HISTORICAL_SUBJECT), false);
  assert.equal(extractLinearRef(HISTORICAL_SUBJECT), null);
});

test('BYPASS: a Linear ref in the body does not satisfy the subject rule', () => {
  const result = inspectCommit({
    subject: HISTORICAL_SUBJECT,
    body: `${VALID.body}\n\nSee UNI-2640.`,
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('missing-linear-ref'), result);
});

test('BYPASS: UTF-8 / SHA-256 / ISO-8601 / NODE-22 are not Linear refs', () => {
  // A generic `[A-Z]{2,4}-\\d+` would accept every one of these and the
  // historical subject could be rewritten "handle UTF-8 in lockfiles" to
  // sneak through. The allowlist exists so that cannot happen.
  for (const subject of [
    'fix(ci): handle UTF-8 in commit messages',
    'feat(crypto): add SHA-256 hashing',
    'docs: timestamps are ISO-8601',
    'chore: pin NODE-22 in the image',
    'fix: OK-1 placeholder',
    'feat: AB-99 not a workspace team',
  ]) {
    assert.equal(hasLinearRef(subject), false, subject);
  }
  assert.deepEqual([...LINEAR_TEAM_PREFIXES], ['UNI', 'RA', 'SYN', 'CCW', 'DR']);
});

test('a subject with only UNI- (no digits) or a six-digit id does not match', () => {
  assert.equal(hasLinearRef('feat: ready (UNI-)'), false);
  assert.equal(hasLinearRef('feat: ready (UNI-123456)'), false);
});

// ── Gate: line ──────────────────────────────────────────────────────────────

test('POSITIVE: Gate: line accepted with content, optional markdown bold', () => {
  assert.equal(hasGateLine('Gate: tsc PASS · eslint clean.'), true);
  assert.equal(hasGateLine('**Gate:** vitest 10/10.\n'), true);
  assert.equal(hasGateLine('intro\n\n  Gate: focused suite PASS.\n'), true);
});

test('MUTATION: missing, empty, or lowercase gate lines fail', () => {
  assert.equal(hasGateLine(''), false);
  assert.equal(hasGateLine('No receipts in this body.'), false);
  assert.equal(hasGateLine('Gate:'), false);
  assert.equal(hasGateLine('Gate:   '), false);
  assert.equal(hasGateLine('gate: tsc PASS.'), false);
  assert.equal(hasGateLine('The Gate: word mid-sentence does not count.'), false);
});

test('BYPASS: Gate: on the subject does not satisfy the body rule', () => {
  const result = inspectCommit({
    subject: `${VALID.subject} Gate: claimed`,
    body: 'Explains the change. No gate line here.',
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reasons, ['missing-gate-line']);
});

test('MUTATION: a valid subject without a Gate: body is rejected', () => {
  const result = inspectCommit({
    subject: VALID.subject,
    body: 'Explains the safety invariant. No receipts.',
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reasons, ['missing-gate-line']);
});

test('POSITIVE: a fully conforming commit is accepted', () => {
  const result = inspectCommit(VALID);
  assert.deepEqual(result, { ok: true, skipped: false });
});

// ── Mechanical merges ───────────────────────────────────────────────────────

test('POSITIVE: two-parent merges and GitHub merge subjects are skipped', () => {
  assert.equal(
    isMechanicalMerge({ subject: 'Merge branch \'main\' into feat/x', parents: ['a', 'b'] }),
    true,
  );
  assert.equal(
    isMechanicalMerge({ subject: 'Merge pull request #1066 from CleanExpo/x', parents: ['a'] }),
    true,
  );
  const skipped = inspectCommit({
    subject: 'Merge branch \'main\' into cursor/commit-message-gate-902f',
    body: '',
    parents: ['aaa', 'bbb'],
  });
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.ok, true);
});

test('a regular commit is not skipped just because its subject mentions merge', () => {
  assert.equal(
    isMechanicalMerge({ subject: 'feat: stop merging silent skips (UNI-1)', parents: ['a'] }),
    false,
  );
});

// ── Range inspection ────────────────────────────────────────────────────────

test('MUTATION: a good HEAD does not hide an earlier bad commit in the range', () => {
  const { violations, checked } = inspectCommits([
    { sha: 'bad', subject: HISTORICAL_SUBJECT, body: VALID.body, parents: ['a'] },
    { sha: 'good', ...VALID, parents: ['bad'] },
  ]);
  assert.equal(checked, 2);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].sha, 'bad');
  assert.ok(violations[0].reasons.includes('missing-linear-ref'));
});

test('POSITIVE: an empty commit list is clean, not a vacuous pass-by-skip', () => {
  const { violations, checked, skipped } = inspectCommits([]);
  assert.deepEqual({ violations, checked, skipped }, { violations: [], checked: 0, skipped: 0 });
});

// ── Range resolution (fail closed) ──────────────────────────────────────────

test('MUTATION: a missing base is an error, never an empty clean range', () => {
  const missing = resolveRange({
    argv: ['origin/does-not-exist', 'HEAD'],
    refExists: () => false,
  });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /base ref not found/);

  const noDefault = resolveRange({ argv: [], env: {}, refExists: () => false });
  assert.equal(noDefault.ok, false);
  assert.match(noDefault.error, /cannot resolve a base ref/);
});

test('POSITIVE: explicit args and GITHUB_BASE_REF resolve when the ref exists', () => {
  const explicit = resolveRange({
    argv: ['origin/main', 'HEAD'],
    refExists: (ref) => ref === 'origin/main',
  });
  assert.deepEqual(explicit, { ok: true, base: 'origin/main', head: 'HEAD' });

  const fromCi = resolveRange({
    argv: [],
    env: { GITHUB_BASE_REF: 'main' },
    refExists: (ref) => ref === 'origin/main',
  });
  assert.deepEqual(fromCi, { ok: true, base: 'origin/main', head: 'HEAD' });
});

test('parseGitLog reconstructs subject, body and parents from the record format', () => {
  const raw = [
    'aaa\x1fparent1\x1ffeat: one (UNI-1)\x1fbody one\n\nGate: yes.\x1e',
    'bbb\x1fparent1 parent2\x1fMerge branch \'main\'\x1f\x1e',
  ].join('');
  const commits = parseGitLog(raw);
  assert.equal(commits.length, 2);
  assert.equal(commits[0].subject, 'feat: one (UNI-1)');
  assert.match(commits[0].body, /Gate: yes/);
  assert.deepEqual(commits[1].parents, ['parent1', 'parent2']);
});

// ── CLI against a throwaway repo (the historical instance, end to end) ──────

test('MUTATION (e2e): historical subject + no Gate: fails the CLI', () => {
  const { dir, git } = makeRepo();
  try {
    const base = commitFile(dir, git, {
      content: 'base\n',
      message: 'chore: seed (UNI-1)\n\nGate: fixture seed.\n',
    });
    commitFile(dir, git, {
      content: 'bump\n',
      message: HISTORICAL_SUBJECT,
    });

    const code = main({ cwd: dir, argv: [base, 'HEAD'] });
    assert.equal(code, 1, 'the historical instance must fail the CLI');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('POSITIVE (e2e): a conforming range exits 0', () => {
  const { dir, git } = makeRepo();
  try {
    const base = commitFile(dir, git, {
      content: 'base\n',
      message: 'chore: seed (UNI-1)\n\nGate: fixture seed.\n',
    });
    commitFile(dir, git, {
      content: 'work\n',
      message: `${VALID.subject}\n\n${VALID.body}\n`,
    });

    const code = main({ cwd: dir, argv: [base, 'HEAD'] });
    assert.equal(code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MUTATION (e2e): missing base exits 1 — shallow-checkout bypass', () => {
  const { dir } = makeRepo();
  try {
    const code = main({ cwd: dir, argv: ['origin/main', 'HEAD'] });
    assert.equal(code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MUTATION (e2e): a good tip does not hide an earlier bad commit', () => {
  const { dir, git } = makeRepo();
  try {
    const base = commitFile(dir, git, {
      content: 'base\n',
      message: 'chore: seed (UNI-1)\n\nGate: fixture seed.\n',
    });
    commitFile(dir, git, {
      path: 'bad',
      content: 'bad\n',
      message: HISTORICAL_SUBJECT,
    });
    commitFile(dir, git, {
      path: 'good',
      content: 'good\n',
      message: `${VALID.subject}\n\n${VALID.body}\n`,
    });

    const code = main({ cwd: dir, argv: [base, 'HEAD'] });
    assert.equal(code, 1, 'an earlier convention-breaking commit must still fail the range');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Wiring: CI + preflight + npm script ─────────────────────────────────────

test('the CI job fetches history and runs both the tests and the checker', () => {
  const ci = readFileSync(CI_PATH, 'utf8');
  assert.match(ci, /^ {2}commit-messages:/m, 'ci.yml must declare a commit-messages job');

  const job = ci.split(/^ {2}[A-Za-z0-9_-]+:/m).find((block) =>
    block.includes('Commit-message convention'),
  );
  assert.ok(job, 'the commit-messages job must keep a recognisable name');
  assert.match(job, /fetch-depth:\s*0/, 'a shallow clone would hide the range and pass empty');
  assert.match(
    job,
    /check-commit-messages\.test\.mjs/,
    'CI must execute the mutation controls, not only the checker',
  );
  assert.match(job, /check-commit-messages\.mjs/, 'CI must run the checker against the PR range');
  assert.doesNotMatch(job, /\bcontinue-on-error:\s*true\b/, 'the job must be able to fail the workflow');
  assert.doesNotMatch(job, /^ {4}if:/m, 'a gated job is not a gate');
});

test('preflight mirrors the CI job as an always-run cheap gate', () => {
  const src = readFileSync(PREFLIGHT_PATH, 'utf8');
  assert.match(src, /ciJob:\s*'commit-messages'/);
  assert.match(src, /check:commit-messages/);
  assert.match(
    src,
    /id: 'commit-messages'[\s\S]*?always: true/,
    'path-scoping a commit-message check would skip the very PR that needs it',
  );
});

test('package.json exposes check:commit-messages as tests-then-checker', () => {
  const scripts = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')).scripts;
  assert.match(
    scripts['check:commit-messages'],
    /node --test scripts\/__tests__\/check-commit-messages\.test\.mjs/,
  );
  assert.match(scripts['check:commit-messages'], /node scripts\/check-commit-messages\.mjs/);
});

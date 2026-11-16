/**
 * The weekly docs-automation bot must write a commit that passes the repo's
 * commit-message check (UNI-3431).
 *
 * WHY. `.github/workflows/nexus-official-docs-automation.yml` commits refreshed
 * vendor-intelligence snapshots and opens a proposal pull request. Its commit
 * was `chore(nexus-docs): propose vendor-intelligence updates (N material)`:
 * no Linear ref on the subject, no Gate: line in the body. The CI job
 * `commit-messages` (scripts/check-commit-messages.mjs) would therefore fail
 * every proposal pull request the bot opened. Codex review round 3 on PR #1408
 * (UNI-3418) found this.
 *
 * HOW. The test does not copy the message. It cuts the real shell lines out of
 * the workflow step (from `material=` up to the `git push`), runs them in a
 * scratch git repository, and runs the real checker's main() on the result.
 * If someone edits the workflow message, this test judges the edit, not a copy.
 * On the pre-UNI-3431 workflow text this test fails: the checker returns 1.
 */

import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractLinearRef, hasGateLine, main } from '../check-commit-messages.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_PATH = join(
  repoRoot,
  '.github',
  'workflows',
  'nexus-official-docs-automation.yml',
);
const STEP_NAME = 'Open or update the proposal pull request';
const MATERIAL_EXPR = '${{ steps.review.outputs.material }}';
const MATERIAL = '36';

const indentOf = (line) => line.length - line.trimStart().length;

/** The dedented `run: |` block of the named step, read from the workflow text. */
export function stepRunBlock(workflowText, stepName = STEP_NAME) {
  const lines = workflowText.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `- name: ${stepName}`);
  assert.ok(start >= 0, `workflow must keep a step named "${stepName}"`);
  const stepIndent = indentOf(lines[start]);

  let runAt = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() && indentOf(line) <= stepIndent) break; // next step
    if (/^\s+run:\s*\|\s*$/.test(line)) {
      runAt = i;
      break;
    }
  }
  assert.ok(runAt >= 0, `step "${stepName}" must have a run: | block`);

  const runIndent = indentOf(lines[runAt]);
  const body = [];
  for (let i = runAt + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() && indentOf(line) <= runIndent) break;
    body.push(line);
  }
  const minIndent = Math.min(...body.filter((l) => l.trim()).map(indentOf));
  return body.map((l) => l.slice(minIndent)).join('\n');
}

/** The lines that build the commit: from `material=` up to, not including, `git push`. */
export function commitSlice(runBlock) {
  const lines = runBlock.split('\n');
  const from = lines.findIndex((l) => /^material=/.test(l));
  const to = lines.findIndex((l, i) => i > from && /^git push\b/.test(l));
  assert.ok(from >= 0, 'the step must set material= before committing');
  assert.ok(to > from, 'the step must push after committing');
  const slice = lines.slice(from, to).join('\n');
  assert.equal(
    (slice.match(/^git commit\b/gm) ?? []).length,
    1,
    'exactly one git commit must sit between material= and git push',
  );
  return slice;
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'docs-proposal-commit-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '--quiet', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');
  writeFileSync(join(dir, 'base.txt'), 'base\n');
  git('add', 'base.txt');
  git('commit', '--quiet', '-m', 'chore: base (UNI-1)', '-m', 'Gate: test fixture.');
  return { dir, git };
}

/** Build the commit exactly as the workflow step does, in a scratch repo. */
function commitAsWorkflowDoes(workflowText) {
  const slice = commitSlice(stepRunBlock(workflowText));
  assert.ok(slice.includes(MATERIAL_EXPR), 'the commit lines must read the review material count');
  const script = slice.split(MATERIAL_EXPR).join(MATERIAL);
  assert.doesNotMatch(
    script,
    /\$\{\{/,
    'the commit lines use a GitHub expression this test does not model; extend the test',
  );

  const { dir, git } = makeRepo();
  git('checkout', '--quiet', '-b', 'automation/nexus-docs-intelligence');
  writeFileSync(join(dir, 'snapshot.txt'), 'changed vendor doc\n');
  git('add', 'snapshot.txt');

  const res = spawnSync('bash', ['-c', `set -euo pipefail\n${script}\n`], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'CleanExpo/Unite-Group',
      GITHUB_RUN_ID: '1234567890',
    },
  });
  assert.equal(res.status, 0, `the workflow commit lines failed:\n${res.stderr}`);

  const subject = git('log', '-1', '--format=%s').trim();
  const body = git('log', '-1', '--format=%b');
  return { dir, subject, body };
}

/** Run the real checker's main() on main..HEAD, capturing its output. */
function runChecker(dir) {
  const out = [];
  const { log, error } = console;
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try {
    return { code: main({ cwd: dir, argv: ['main', 'HEAD'], env: {} }), out: out.join('\n') };
  } finally {
    console.log = log;
    console.error = error;
  }
}

test('a commit built the way the workflow builds it passes check-commit-messages', () => {
  const { dir, subject, body } = commitAsWorkflowDoes(readFileSync(WORKFLOW_PATH, 'utf8'));
  try {
    const { code, out } = runChecker(dir);
    assert.equal(code, 0, `check-commit-messages rejected the bot commit:\n${out}`);
    assert.match(out, /clean \(1 checked, 0 skipped/, 'the bot commit must be checked, not skipped');

    assert.equal(extractLinearRef(subject), 'UNI-3431', 'the bot cites its standing ticket');
    assert.ok(subject.includes(`(${MATERIAL} material)`), 'the subject keeps the material count');
    assert.match(body, /^What cannot happen after this merge: \S/m);
    assert.ok(hasGateLine(body), 'the body carries a Gate: line');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the Gate: paragraph names only the automated review that ran', () => {
  const { dir, body } = commitAsWorkflowDoes(readFileSync(WORKFLOW_PATH, 'utf8'));
  try {
    // Collapse the hard wraps so a phrase split across two lines still matches.
    const gate = body.slice(body.search(/^Gate:/m)).replace(/\s+/g, ' ');
    assert.match(gate, /nexus-docs-watch/, 'names the fetch-and-fingerprint step');
    assert.match(gate, /nexus-docs-review/, 'names the deterministic classifier');
    assert.match(gate, /No human or model review has run/, 'never implies a review that did not run');
    assert.match(gate, /actions\/runs\/1234567890/, 'links the run that produced the evidence');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Control: the pre-UNI-3431 step text must fail this same harness. A test never
// seen red is not evidence. This is the commit line the workflow had before.
const OLD_STEP = [
  '      - name: Open or update the proposal pull request',
  '        run: |',
  '          set -euo pipefail',
  '          material="${{ steps.review.outputs.material }}"',
  '          git commit -m "chore(nexus-docs): propose vendor-intelligence updates (${material} material)"',
  '          git push --force-with-lease origin "${AUTOMATION_BRANCH}"',
  '',
].join('\n');

test('control: the old workflow commit line fails the same harness', () => {
  const { dir } = commitAsWorkflowDoes(OLD_STEP);
  try {
    const { code, out } = runChecker(dir);
    assert.equal(code, 1, 'the old bot commit must be rejected');
    assert.match(out, /subject has no Linear ref/);
    assert.match(out, /body has no Gate: line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// UNI-3023: Monorepo CI runs once per pushed SHA. A `pull_request` trigger re-ran the whole suite on the same SHA
// as soon as a PR opened, so every PR waited for CI twice. These are structural checks on the workflow text
// (no YAML dependency): if any of them regresses, a PR doubles its wait again, or a branch push scans main's
// history for secrets (UNI-2943), or the commit-message check judges no range at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const code = ci.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

function triggers() {
  const start = code.indexOf('\non:\n');
  const end = code.indexOf('\npermissions:', start);
  assert.ok(start >= 0 && end > start, 'ci.yml has an on: block followed by permissions:');
  return code.slice(start + 5, end);
}

function step(name) {
  const at = code.indexOf(`- name: ${name}`);
  assert.ok(at >= 0, `step "${name}" exists`);
  const next = code.indexOf('\n      - ', at + 1);
  return code.slice(at, next < 0 ? undefined : next);
}

test('triggers: push on every branch and workflow_dispatch, never pull_request', () => {
  const on = triggers();
  assert.match(on, /^ {2}push:\s*$/m, 'push trigger present');
  assert.doesNotMatch(on, /^ {4}branches:/m, 'push is not limited to some branches');
  assert.doesNotMatch(on, /^ {2}pull_request(_target)?:/m, 'no pull_request trigger (it re-ran CI on the same SHA)');
  assert.match(on, /^ {2}workflow_dispatch:/m, 'manual escape hatch kept');
});

test('no step depends on pull_request-only context any more', () => {
  assert.doesNotMatch(code, /github\.event\.pull_request/);
  assert.doesNotMatch(code, /github\.base_ref/);
  assert.doesNotMatch(code, /event_name\s*[!=]=\s*'?"?pull_request/);
});

test('gitleaks: the action only on main, the origin/main..HEAD range scan on every other ref', () => {
  const action = step('Scan git history for secrets');
  assert.match(action, /if: github\.ref == 'refs\/heads\/main'\s*$/m);
  const range = step("Scan this branch's commits for secrets");
  assert.match(range, /if: github\.ref != 'refs\/heads\/main'\s*$/m);
  assert.doesNotMatch(range, /event_name/, 'range scan runs for push and dispatch alike');
  assert.match(range, /origin\/main\.\.HEAD/);
});

test('commit messages: every run judges origin/main..HEAD explicitly', () => {
  const s = step('Check commit messages in the PR range');
  assert.match(s, /node scripts\/check-commit-messages\.mjs origin\/main HEAD\s*$/m);
  assert.doesNotMatch(s, /event_name/);
});

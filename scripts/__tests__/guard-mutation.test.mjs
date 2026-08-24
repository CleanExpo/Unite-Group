// scripts/__tests__/guard-mutation.test.mjs
//
// Proves the workflow security guard FAILS when the defects it exists to catch
// are actually present.
//
// This exists because that guard has been defeated nine times across four
// independent review rounds, and every single time the failure looked identical
// from the inside: the guard asserted the good state was present, passed, and
// was never run against the bad state. Writing a guard and running it once tells
// you it accepts today's config. It tells you nothing about whether it rejects
// tomorrow's mistake — and that second property is the entire point.
//
// So each case below plants a real defect into a COPY of the workflow tree,
// runs the guard against that copy, and asserts it fails. A guard that stays
// green under its own planted defect fails here, in CI, without waiting for a
// reviewer to notice.
//
// Every case is drawn from a defect independent review actually planted and got
// away with.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const GUARD = join('scripts', '__tests__', 'claude-review-security.test.mjs')
const REVIEW_WF = join('.github', 'workflows', 'claude-code-review.yml')

/** A throwaway tree with the workflows, the guard, and package.json. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'guardmut-'))
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true })
  mkdirSync(join(dir, 'scripts', '__tests__'), { recursive: true })
  cpSync(join(ROOT, '.github', 'workflows'), join(dir, '.github', 'workflows'), { recursive: true })
  cpSync(join(ROOT, GUARD), join(dir, GUARD))
  return dir
}

/**
 * Run the guard inside the sandbox and report what actually happened.
 *
 * Returns { ran, passed, failed }. Distinguishing "the guard ran and passed"
 * from "the guard never ran" matters: a crashed guard emits no `# fail` line,
 * so a naive check reads it as a pass. The first version of this harness had
 * exactly that hole, and every mutation case reported the guard as green when
 * in fact the sandbox was broken — the same class of defect this file exists to
 * catch, reproduced inside the thing catching it.
 */
function runGuard(dir) {
  let out = ''
  try {
    out = execFileSync('node', ['--test', GUARD], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // A nested `node --test` inherits NODE_TEST_CONTEXT from the parent runner
      // and switches to a child reporting protocol, emitting no `# pass` /
      // `# fail` summary. Without clearing it the child looks like it never ran.
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
    })
  } catch (err) {
    out = String(err.stdout ?? '') + String(err.stderr ?? '')
  }

  const passMatch = out.match(/^# pass (\d+)/m)
  const failMatch = out.match(/^# fail (\d+)/m)

  return {
    ran: Boolean(passMatch || failMatch),
    passed: passMatch ? Number(passMatch[1]) : 0,
    failed: failMatch ? Number(failMatch[1]) : 0,
    out,
  }
}

function withWorkflow(dir, transform) {
  const path = join(dir, REVIEW_WF)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  assert.notEqual(after, before, 'mutation anchor not found — the mutant was never planted')
  writeFileSync(path, after)
}

function run(name, transform) {
  const dir = sandbox()
  try {
    withWorkflow(dir, transform)
    const r = runGuard(dir)
    assert.ok(r.ran, `the guard never executed under: ${name}\n${r.out.slice(0, 600)}`)
    assert.ok(
      r.failed > 0,
      `the guard RAN and stayed green under: ${name} (pass ${r.passed}, fail ${r.failed})`,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('the sandbox itself is clean (positive control)', () => {
  const dir = sandbox()
  try {
    const r = runGuard(dir)
    // Both halves matter. "ran" proves the sandbox is a working tree rather than
    // a pile the guard cannot read; "passed with zero failures" proves the
    // mutants below are what turns it red.
    assert.ok(r.ran, `guard did not execute in a clean sandbox:\n${r.out.slice(0, 600)}`)
    assert.ok(r.passed > 0, 'guard ran no assertions in a clean sandbox')
    assert.equal(r.failed, 0, `guard failed on an UNMUTATED sandbox:\n${r.out.slice(0, 600)}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('catches an unquoted track_progress', () => {
  run('track_progress: true', (s) =>
    s.replace('          claude_code_oauth_token:',
              '          track_progress: true\n          claude_code_oauth_token:'))
})

test('catches a QUOTED track_progress key', () => {
  run('"track_progress": true', (s) =>
    s.replace('          claude_code_oauth_token:',
              '          "track_progress": true\n          claude_code_oauth_token:'))
})

test('catches a second --allowedTools flag', () => {
  run('accumulated allowedTools', (s) =>
    s.replace('Bash(gh pr view:*)"', 'Bash(gh pr view:*)" --allowedTools "Bash(gh pr comment:*)"'))
})

test('catches the kebab-case --allowed-tools spelling', () => {
  run('--allowed-tools', (s) =>
    s.replace('Bash(gh pr view:*)"', 'Bash(gh pr view:*)" --allowed-tools "Bash(gh pr comment:*)"'))
})

test('catches removal of the required inline-comment tool', () => {
  run('required tool removed', (s) =>
    s.replace('mcp__github_inline_comment__create_inline_comment,', ''))
})

test('catches an unpinned action reference', () => {
  run('@v1 instead of a SHA', (s) =>
    s.replace(/claude-code-action@[a-f0-9]{40}/, 'claude-code-action@v1'))
})

test('catches a matrix that doubles the invocation', () => {
  run('two-entry strategy.matrix', (s) =>
    s.replace('    runs-on: ubuntu-latest',
              '    strategy:\n      matrix:\n        shard: [1, 2]\n    runs-on: ubuntu-latest'))
})

test('catches a review step that declares no tools at all', () => {
  // Undeclared means inheriting git add/commit/rm and the push wrapper from the
  // action's defaults at the pinned SHA.
  // Renaming the key is the cleanest way to simulate "no tools declared":
  // the step keeps its shape and stays valid YAML, but `with.claude_args` is
  // gone, so the action would fall back to its write-capable defaults.
  //
  // The first version of this case used a regex ending in \Z, which JavaScript
  // does not support — it matches a literal Z, so the mutant never applied. The
  // harness reported that rather than passing, which is the whole point of
  // asserting the mutation actually changed the file.
  run('claude_args removed entirely', (s) =>
    s.replace('          claude_args: |', '          claude_args_removed: |'))
})

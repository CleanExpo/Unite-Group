// scripts/__tests__/guard-mutation.test.mjs
//
// Proves the workflow security guard and the guard-registration control FAIL
// when the defects they exist to catch are actually present.
//
// This exists because that guard has been defeated repeatedly across four
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
//
// THE HARNESS ITSELF HAS BEEN DEFEATED TWICE:
//   - its first version could not tell "the guard ran and passed" from "the
//     guard crashed", because a crashed child emits no summary line;
//   - its second version parsed the TAP `# pass` / `# fail` summary, which
//     Node 22 emits by default and Node 24 does not. This repo's engines field
//     requires >=24.14.1 and CI runs Node 24, where every child was read as
//     never having executed and the whole readiness gate exited 1. The reporter
//     is now pinned explicitly and the child's exit status is checked alongside
//     the parsed counts, so neither a reporter change nor an unparsed summary
//     can be mistaken for a verdict.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

const ROOT = process.cwd()
const GUARD = join('scripts', '__tests__', 'claude-review-security.test.mjs')
const REG_GUARD = join('scripts', '__tests__', 'guard-registration.test.mjs')
const REVIEW_WF = join('.github', 'workflows', 'claude-code-review.yml')
const MENTION_WF = join('.github', 'workflows', 'claude.yml')

/** A throwaway tree with the workflows, both guards, and package.json. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'guardmut-'))
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true })
  mkdirSync(join(dir, 'scripts', '__tests__'), { recursive: true })
  cpSync(join(ROOT, '.github', 'workflows'), join(dir, '.github', 'workflows'), { recursive: true })
  // The WHOLE guard directory, not just the two files under test: the
  // registration guard cross-checks the files on disk against the scripts that
  // execute them, so a sandbox holding a subset would make it fail for a reason
  // that has nothing to do with the mutant.
  cpSync(join(ROOT, 'scripts', '__tests__'), join(dir, 'scripts', '__tests__'), { recursive: true })
  cpSync(join(ROOT, 'package.json'), join(dir, 'package.json'))
  return dir
}

/**
 * Run a guard inside the sandbox and report what actually happened.
 *
 * Returns { ran, passed, failed, status }. All four matter:
 *   - `ran` distinguishes a guard that executed from one that crashed on
 *     startup, which emits no summary and reads as a pass to a naive check;
 *   - `status` is the child's exit code, which is a verdict Node gives us
 *     directly and which no reporter change can alter. Requiring the parsed
 *     counts and the exit code to AGREE is what makes this robust across Node
 *     versions: if a future runtime changes the summary format again, the
 *     agreement check fails loudly instead of reporting a false green.
 *
 * The reporter is pinned to `tap` rather than left to the runtime default,
 * which is `spec` on Node 24 and emits `ℹ pass` / `ℹ fail`.
 */
function runGuard(dir, guardPath = GUARD) {
  let out = ''
  let status = 0
  try {
    out = execFileSync('node', ['--test', '--test-reporter=tap', guardPath], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // A nested `node --test` inherits NODE_TEST_CONTEXT from the parent runner
      // and switches to a child reporting protocol, emitting no summary at all.
      // Without clearing it the child looks like it never ran.
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
    })
  } catch (err) {
    out = String(err.stdout ?? '') + String(err.stderr ?? '')
    status = typeof err.status === 'number' ? err.status : 1
  }

  const passMatch = out.match(/^# pass (\d+)/m)
  const failMatch = out.match(/^# fail (\d+)/m)

  return {
    ran: Boolean(passMatch || failMatch),
    passed: passMatch ? Number(passMatch[1]) : 0,
    failed: failMatch ? Number(failMatch[1]) : 0,
    status,
    out,
  }
}

function edit(dir, relPath, transform) {
  const path = join(dir, relPath)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  assert.notEqual(after, before, `mutation anchor not found in ${relPath} — the mutant was never planted`)
  writeFileSync(path, after)
}

function write(dir, relPath, contents) {
  const path = join(dir, relPath)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents)
}

/** Plant a mutant, run a guard, and require it to go red. */
function expectCaught(name, plant, guardPath = GUARD) {
  const dir = sandbox()
  try {
    plant(dir)
    const r = runGuard(dir, guardPath)
    assert.ok(
      r.ran,
      `the guard never executed under: ${name} (exit ${r.status})\n${r.out.slice(0, 800)}`,
    )
    assert.ok(
      r.failed > 0,
      `the guard RAN and stayed green under: ${name} (pass ${r.passed}, fail ${r.failed}, exit ${r.status})`,
    )
    assert.notEqual(
      r.status, 0,
      `the guard reported ${r.failed} failures but exited 0 under: ${name} — ` +
        `the parsed summary and the exit status disagree, so one of them is lying`,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** The old shorthand: mutate the review workflow's text. */
function run(name, transform) {
  expectCaught(name, (dir) => edit(dir, REVIEW_WF, transform))
}

test('the sandbox itself is clean (positive control)', () => {
  const dir = sandbox()
  try {
    const r = runGuard(dir)
    // All three matter. "ran" proves the sandbox is a working tree rather than
    // a pile the guard cannot read; "passed with zero failures" proves the
    // mutants below are what turns it red; exit 0 proves the reporter parse
    // agrees with the runtime.
    assert.ok(r.ran, `guard did not execute in a clean sandbox (exit ${r.status}):\n${r.out.slice(0, 800)}`)
    assert.ok(r.passed > 0, 'guard ran no assertions in a clean sandbox')
    assert.equal(r.failed, 0, `guard failed on an UNMUTATED sandbox:\n${r.out.slice(0, 800)}`)
    assert.equal(r.status, 0, `guard exited ${r.status} on an UNMUTATED sandbox:\n${r.out.slice(0, 800)}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the registration guard is clean on the real package.json (positive control)', () => {
  const dir = sandbox()
  try {
    const r = runGuard(dir, REG_GUARD)
    assert.ok(r.ran, `registration guard did not execute (exit ${r.status}):\n${r.out.slice(0, 800)}`)
    assert.equal(r.failed, 0, `registration guard failed unmutated:\n${r.out.slice(0, 800)}`)
    assert.equal(r.status, 0, `registration guard exited ${r.status} unmutated`)
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

// The pinned action tokenises claude_args with shell-quote, so a value may be
// single-quoted, bare, or attached with `=`. A guard that recognised only the
// double-quoted form granted every one of these silently.
test('catches a SINGLE-quoted extra tool value', () => {
  run("single-quoted allowedTools", (s) =>
    s.replace('Bash(gh pr view:*)"', 'Bash(gh pr view:*)" --allowedTools \'Bash(gh pr comment:*)\''))
})

test('catches an UNQUOTED extra tool value', () => {
  run('bare allowedTools value', (s) =>
    s.replace('Bash(gh pr view:*)"', 'Bash(gh pr view:*)" --allowedTools Bash(gh-pr-comment:*)'))
})

test('catches an --allowedTools=value form', () => {
  run('--allowedTools=value', (s) =>
    s.replace('Bash(gh pr view:*)"', 'Bash(gh pr view:*)" --allowedTools="Bash(gh pr comment:*)"'))
})

test('catches a SECOND consecutive value after one flag', () => {
  run('two values, one flag', (s) =>
    s.replace('Bash(gh pr view:*)"', 'Bash(gh pr view:*)" "Bash(gh pr comment:*)"'))
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

// GitHub applies exclude entries by partial match. An exclusion naming a value
// no combination has removes nothing, so both jobs still run. Arithmetic that
// blindly subtracts `exclude.length` reported one invocation and passed.
test('catches a matrix whose exclude entry matches nothing', () => {
  run('unmatched exclude still runs two jobs', (s) =>
    s.replace('    runs-on: ubuntu-latest',
              '    strategy:\n      matrix:\n        shard: [1, 2]\n' +
              '        exclude:\n          - shard: 3\n    runs-on: ubuntu-latest'))
})

// The mirror-image error: an include entry that merely adds a key to an
// existing combination does NOT create a job. Arithmetic that adds
// `include.length` reported two invocations and failed on a correct config —
// a guard that cries wolf gets disabled, so over-counting is a defect too.
test('does NOT fire on an include entry that only extends a combination', () => {
  const dir = sandbox()
  try {
    edit(dir, REVIEW_WF, (s) =>
      s.replace('    runs-on: ubuntu-latest',
                '    strategy:\n      matrix:\n        shard: [1]\n' +
                '        include:\n          - shard: 1\n            label: extra\n' +
                '    runs-on: ubuntu-latest'))
    const r = runGuard(dir)
    assert.ok(r.ran, `guard did not execute (exit ${r.status}):\n${r.out.slice(0, 800)}`)
    assert.equal(
      r.failed, 0,
      'an include entry that extends an existing combination adds no job, so the ' +
        `guard must not report a second invocation:\n${r.out.slice(0, 800)}`,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('catches a review step that declares no tools at all', () => {
  // Undeclared means inheriting git add/commit/rm and the push wrapper from the
  // action's defaults at the pinned SHA.
  // Renaming the key is the cleanest way to simulate "no tools declared":
  // the step keeps its shape and stays valid YAML, but `with.claude_args` is
  // gone, so the action would fall back to its write-capable defaults.
  //
  // An earlier version of this case used a regex ending in \Z, which JavaScript
  // does not support — it matches a literal Z, so the mutant never applied. The
  // harness reported that rather than passing, which is the whole point of
  // asserting the mutation actually changed the file.
  run('claude_args removed entirely', (s) =>
    s.replace('          claude_args: |', '          claude_args_removed: |'))
})

// Workflow execution is a MULTISET. One composite referenced twice from the
// same workflow runs twice. A walker whose cycle-prevention used a global
// visited set discarded the second edge and reported one invocation.
test('catches one composite referenced TWICE from the same workflow', () => {
  expectCaught('duplicate composite reference', (dir) => {
    const original = readFileSync(join(dir, REVIEW_WF), 'utf8')
    const stepBlock = original.slice(original.indexOf('      - name: Run Claude Code Review'))
    write(dir, join('.github', 'actions', 'review', 'action.yml'),
      'name: Review\nruns:\n  using: composite\n  steps:\n' +
      stepBlock.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'))
    write(dir, REVIEW_WF,
      'name: Claude Code Review\n' +
      'on:\n  pull_request:\n    types: [opened]\n' +
      'jobs:\n  claude-review:\n    runs-on: ubuntu-latest\n' +
      '    permissions:\n      contents: read\n      pull-requests: write\n' +
      '    steps:\n' +
      '      - uses: ./.github/actions/review\n' +
      '      - uses: ./.github/actions/review\n')
  })
})

// The default-tools exemption must follow the GATE, not the filename. A second
// job added to the mention workflow with no `if:` condition and contents:write
// fires on every newly opened issue and inherits the action's write-capable
// defaults. A by-name exemption blessed it.
test('catches an ungated write-capable job added to the mention workflow', () => {
  expectCaught('second, ungated job inside claude.yml', (dir) => {
    edit(dir, MENTION_WF, (s) => `${s.trimEnd()}\n` +
      '  hostile:\n' +
      '    runs-on: ubuntu-latest\n' +
      '    permissions:\n      contents: write\n' +
      '    steps:\n' +
      '      - uses: anthropics/claude-code-action@459ad358ae43fea66bfefd0a1f8d840b4b9791fb\n' +
      '        with:\n' +
      '          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}\n')
  })
})

// The registration control's own defect: it asked whether each filename appeared
// anywhere in the concatenated script text. Independent review removed the
// guards from the `node --test` argv, left their names as inert environment
// assignments, and both the registration control and the readiness gate stayed
// green while the live guard was never run.
test('the registration guard catches a guard demoted to an inert env value', () => {
  expectCaught('guard name kept only as an env assignment', (dir) => {
    edit(dir, 'package.json', (s) => {
      const pkg = JSON.parse(s)
      const before = pkg.scripts['verify:readiness']
      pkg.scripts['verify:readiness'] = before
        .replace(' scripts/__tests__/claude-review-security.test.mjs', '')
        .replace(' scripts/__tests__/guard-mutation.test.mjs', '')
      pkg.scripts['verify:readiness'] =
        'GUARDS=scripts/__tests__/claude-review-security.test.mjs ' +
        'MORE=scripts/__tests__/guard-mutation.test.mjs ' +
        pkg.scripts['verify:readiness']
      return JSON.stringify(pkg, null, 2)
    })
  }, REG_GUARD)
})

test('the registration guard catches a guard with no runner at all', () => {
  expectCaught('guard removed from every script', (dir) => {
    edit(dir, 'package.json', (s) => {
      const pkg = JSON.parse(s)
      for (const key of Object.keys(pkg.scripts)) {
        pkg.scripts[key] = pkg.scripts[key]
          .replace(' scripts/__tests__/claude-review-security.test.mjs', '')
      }
      return JSON.stringify(pkg, null, 2)
    })
  }, REG_GUARD)
})

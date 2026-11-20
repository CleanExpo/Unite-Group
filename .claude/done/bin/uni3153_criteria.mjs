#!/usr/bin/env node
/**
 * Runnable criteria for UNI-3153 — the autonomy lane gate's executable-trust
 * decision on Windows. Each subcommand exits non-zero on failure.
 *
 * Written so the Done contract carries commands, not prose, and so a reviewer
 * on another machine can run the same checks: no absolute path appears here,
 * the repository root is derived from this file's own location, and every check
 * prints an explicit OK token with its counts.
 *
 * The vitest filter cases deserve a word. `vitest -t <pattern>` exits 0 when
 * the pattern matches NOTHING, so "exit code 0" alone would make a renamed or
 * deleted test read as green forever. Every case here therefore reads the JSON
 * reporter and requires at least one test to have actually passed.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// this file lives at <root>/.claude/done/bin/, so three levels up is the git root
const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..', '..')
const APP = path.join(ROOT, 'apps', 'workspace')
const LANES = 'src/server/lanes'
const SUITES = [
  `${LANES}/autonomy-hook.test.ts`,
  `${LANES}/autonomy-gate.test.ts`,
  `${LANES}/autonomy-gate.policy.test.ts`,
  `${LANES}/executable-trust.test.ts`,
]
// What exists on the branch this contract was locked against: 49 + 112 + 10
// hook/gate/policy cases. A floor stops a truncated or mis-filtered run from
// reading as a green suite.
const TEST_FLOOR = 171
const HOOK_SUITE = path.join(APP, 'src', 'server', 'lanes', 'autonomy-hook.test.ts')
const OUT_DIR = path.join(ROOT, '.claude', 'done', 'work', 'uni3153-criteria-out')

/**
 * The Windows environment the suite under test needs, restored from fixed
 * locations rather than from the caller.
 *
 * A criterion recipe runs with a deliberately minimal environment: the harness
 * keeps TEMP, HOME, a locale and a system PATH, and drops everything else,
 * `SystemRoot`, `ProgramFiles` and `PATHEXT` included. On Windows those three
 * ARE the subject here — the gate derives its trusted directories from them, so
 * without them it derives none, refuses every command, and c1 would be a test of
 * an empty environment rather than a test of the gate.
 *
 * They are therefore restored from hardcoded absolute paths, each verified on
 * disk, and never copied from the caller. A fixed absolute path is an identity,
 * which is the rule the harness itself applies to a recipe's interpreter. If
 * none of the candidates is really there, this fails loudly: an environment that
 * cannot be established is unproven, not a default.
 */
function windowsEnv() {
  if (process.platform !== 'win32') return {}
  const roots = ['C:\\Windows', 'C:\\WINDOWS', 'D:\\Windows']
  const programFiles = ['C:\\Program Files', 'D:\\Program Files']
  const root = roots.find((candidate) => existsSync(path.join(candidate, 'System32', 'cmd.exe')))
  const files = programFiles.find((candidate) => existsSync(candidate))
  if (root === undefined || files === undefined) {
    console.log(`FAIL no Windows system root found; looked in: ${roots.join(', ')}`)
    process.exit(3)
  }
  return { SystemRoot: root, ProgramFiles: files, PATHEXT: '.COM;.EXE;.BAT;.CMD' }
}

function vitestCli() {
  const candidates = [
    path.join(APP, 'node_modules', 'vitest', 'vitest.mjs'),
    path.join(APP, 'node_modules', 'vitest', 'dist', 'cli.js'),
  ]
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  // Never a silent skip: a missing runner is an unrunnable check, not a pass.
  console.log(`FAIL vitest cli not found; looked in:\n  ${candidates.join('\n  ')}`)
  process.exit(3)
}

/** Run vitest over the lane suites and return the JSON reporter's counts. */
function runVitest(extraArgs) {
  mkdirSync(OUT_DIR, { recursive: true })
  const out = path.join(OUT_DIR, `vitest-${process.pid}.json`)
  rmSync(out, { force: true })
  const args = [vitestCli(), 'run', ...SUITES, '--reporter=json', `--outputFile=${out}`, ...extraArgs]
  const run = spawnSync(process.execPath, args, {
    cwd: APP,
    stdio: 'inherit',
    env: { ...process.env, ...windowsEnv() },
  })
  if (run.error) {
    console.log(`FAIL could not start vitest: ${run.error.message}`)
    process.exit(3)
  }
  if (!existsSync(out)) {
    console.log('FAIL vitest wrote no JSON report; its exit code alone is not evidence')
    process.exit(3)
  }
  const report = JSON.parse(readFileSync(out, 'utf8'))
  rmSync(out, { force: true })
  return {
    exit: run.status,
    total: report.numTotalTests ?? 0,
    passed: report.numPassedTests ?? 0,
    failed: report.numFailedTests ?? 0,
    pending: report.numPendingTests ?? 0,
    todo: report.numTodoTests ?? 0,
    // Test file names exactly as vitest reported them, with Windows separators
    // folded, so every requested suite can be required by name (PR #1419 review).
    files: (report.testResults ?? []).map((result) => String(result.name).replaceAll('\\', '/')),
  }
}

function suites() {
  const r = runVitest([])
  if (r.failed > 0 || r.exit !== 0) {
    console.log(`FAIL suites: ${r.failed} failed, exit ${r.exit}`)
    return 1
  }
  if (r.pending > 0) {
    console.log(`FAIL suites: ${r.pending} skipped; a skip on the platform under test proves nothing`)
    return 1
  }
  // Vitest counts a todo test in the total but not as pending or passed.
  if (r.todo > 0 || r.passed !== r.total) {
    console.log(`FAIL suites: ${r.passed} passed of ${r.total} (${r.todo} todo); every collected test must pass`)
    return 1
  }
  // Positional paths are filters: a missing or excluded suite drops out silently
  // while the others can still clear the floor. Require each one by name.
  const missing = SUITES.filter((suite) => !r.files.some((file) => file.endsWith(suite.replaceAll('\\', '/'))))
  if (missing.length > 0) {
    console.log(`FAIL suites: no report entry for ${missing.join(', ')}; reported ${r.files.length} files`)
    return 1
  }
  if (r.total < TEST_FLOOR) {
    console.log(`FAIL suites: only ${r.total} tests ran, floor is ${TEST_FLOOR}`)
    return 1
  }
  console.log(`LANE_SUITES_OK total=${r.total} passed=${r.passed} skipped=0 platform=${process.platform}`)
  return 0
}

/** One named behaviour, proven by a test that really ran. */
function one(pattern, label) {
  const r = runVitest(['-t', pattern])
  if (r.failed > 0 || r.exit !== 0) {
    console.log(`FAIL ${label}: ${r.failed} failed, exit ${r.exit}`)
    return 1
  }
  if (r.passed < 1) {
    console.log(`FAIL ${label}: the filter '${pattern}' matched no test, so nothing was proven`)
    return 1
  }
  console.log(`${label}_OK passed=${r.passed} platform=${process.platform}`)
  return 0
}

function noWin32Skips() {
  if (!existsSync(HOOK_SUITE)) {
    console.log(`FAIL ${HOOK_SUITE} does not exist`)
    return 1
  }
  const text = readFileSync(HOOK_SUITE, 'utf8')
  // Positive control first: an empty or truncated file must not read as clean.
  const cases = (text.match(/^\s{2}it[.(]/gm) ?? []).length
  if (cases < 40) {
    console.log(`FAIL hook suite has only ${cases} cases; too few to trust a clean skip count`)
    return 1
  }
  const skips = (text.match(/skipIf\s*\(\s*process\.platform\s*===\s*'win32'\s*\)/g) ?? []).length
  if (skips > 0) {
    console.log(`FAIL ${skips} win32 skip(s) remain in the hook suite`)
    return 1
  }
  console.log(`NO_WIN32_SKIPS_OK cases=${cases} skips=0`)
  return 0
}

function typecheck() {
  const tsc = path.join(APP, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!existsSync(tsc)) {
    console.log(`FAIL tsc not found at ${tsc}`)
    return 3
  }
  const run = spawnSync(process.execPath, [tsc, '--noEmit', '-p', 'tsconfig.json'], {
    cwd: APP,
    stdio: 'inherit',
    env: { ...process.env, ...windowsEnv() },
  })
  if (run.status !== 0) {
    console.log(`FAIL typecheck exit ${run.status}`)
    return 1
  }
  console.log('TYPECHECK_OK')
  return 0
}

const COMMANDS = {
  suites,
  'no-win32-skips': noWin32Skips,
  typecheck,
  'planted-lane-program': () => one('lane-written program named like a safe one', 'PLANTED_LANE_PROGRAM'),
  'user-writable-not-trusted': () => one('a program in a user-writable directory', 'USER_WRITABLE_NOT_TRUSTED'),
  'interpreter-by-path': () => one('an interpreter named by an absolute Windows path', 'INTERPRETER_BY_PATH'),
  'posix-set-unchanged': () => one('the POSIX trusted directories are the six', 'POSIX_SET_UNCHANGED'),
}

const cmd = process.argv[2]
if (!cmd || !(cmd in COMMANDS)) {
  console.log(`usage: uni3153_criteria.mjs {${Object.keys(COMMANDS).join('|')}}`)
  process.exit(2)
}
process.exit(COMMANDS[cmd]())

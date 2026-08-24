// scripts/__tests__/guard-registration.test.mjs
//
// Every guard under scripts/__tests__ must actually be EXECUTED by an npm
// script — not merely mentioned by one.
//
// This exists because claude-review-security.test.mjs was not run at all.
// Independent review planted `track_progress: true` in the live Claude review
// step — the exact defect that guard was written to catch — and
// `npm run verify:readiness` passed 411 tests, exit 0, because package.json's
// explicit test list omitted the file. Three rounds of hardening that guard had
// produced something CI never executed. A guard nobody runs is worse than no
// guard, because it reads as coverage.
//
// The FIRST version of this file then reproduced that defect one level up. It
// asked whether each filename appeared anywhere in the concatenated text of all
// npm scripts. Independent review removed both real guards from the
// `verify:readiness` argument list, kept their names only as inert environment
// assignments, planted `track_progress: true`, and the root gate passed 410
// tests, exit 0 — while this registration control passed 2/2. Substring
// presence is not execution.
//
// So the scripts are now TOKENISED and only files passed as arguments to a
// `node --test` invocation count as registered. `npm run <other>` delegation is
// followed, so a guard registered indirectly still counts.
//
// The check is deliberately "executed by ANY script" rather than "in
// verify:readiness": some guards legitimately have their own runner
// (check:nul-bytes, verify:docs-watch, verify:docs-review). What must never
// happen again is a guard with no runner at all.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROOT = process.cwd()
const GUARD_DIR = join(ROOT, 'scripts', '__tests__')

/** Split a script body into individual command segments. */
function splitCommands(body) {
  return String(body).split(/&&|\|\||[;\n|]/g).map((s) => s.trim()).filter(Boolean)
}

/** Whitespace tokenise, honouring single and double quotes. */
function tokenize(segment) {
  const tokens = []
  let current = ''
  let started = false
  let quote = null
  for (const ch of segment) {
    if (quote) {
      if (ch === quote) { quote = null; continue }
      current += ch
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue }
    if (/\s/.test(ch)) {
      if (started) { tokens.push(current); current = ''; started = false }
      continue
    }
    current += ch
    started = true
  }
  if (started) tokens.push(current)
  return tokens
}

/**
 * The set of test files a script body actually hands to `node --test`.
 *
 * Leading `VAR=value` assignments are stripped and then ignored — that is
 * exactly the disguise independent review used. A path only counts when it is a
 * positional argument of a `node --test` command.
 */
export function executedTestFiles(scripts, name, seen = new Set()) {
  const executed = new Set()
  const body = String(scripts?.[name] ?? '')
  if (!body || seen.has(name)) return executed
  seen.add(name)

  for (const segment of splitCommands(body)) {
    const argv = tokenize(segment)
    let i = 0
    while (i < argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[i])) i += 1
    if (i >= argv.length) continue

    // `npm run <other>` / `pnpm run <other>` delegation.
    if (/^(npm|pnpm|yarn)$/.test(argv[i]) && argv[i + 1] === 'run' && argv[i + 2]) {
      for (const f of executedTestFiles(scripts, argv[i + 2], seen)) executed.add(f)
      continue
    }

    if (argv[i] !== 'node') continue
    const rest = argv.slice(i + 1)
    if (!rest.includes('--test')) continue

    // Being PASSED to `node --test` is not the same as being RUN by it.
    //
    // Round 5: `node --test --test-name-pattern='a^' <both guards>` exits
    // successfully with every test skipped, and the previous parser registered
    // both files — so the readiness command stays green while its guards execute
    // no assertions. That is the orphaned-guard defect wearing a different hat.
    //
    // Rather than reasoning about which patterns match nothing (undecidable in
    // general, and `a^` is only the most obvious of them), any test-SELECTION
    // flag disqualifies the invocation. A guard runner has no legitimate reason
    // to filter: it runs everything or it is not the runner.
    if (rest.some(isSelectionFlag)) continue

    for (const arg of rest) {
      if (arg.startsWith('-')) continue
      if (arg.endsWith('.test.mjs')) executed.add(basename(arg))
    }
  }
  return executed
}

/**
 * Node test-runner flags that can stop a named file's tests from running while
 * the command still exits 0.
 */
const SELECTION_FLAGS = [
  '--test-name-pattern',
  '--test-skip-pattern',
  '--test-only',
  '--test-shard',
]

export function isSelectionFlag(arg) {
  return SELECTION_FLAGS.some((f) => arg === f || arg.startsWith(`${f}=`))
}

/** Every test file executed by any script in package.json. */
export function allExecutedTestFiles(scripts) {
  const all = new Set()
  for (const name of Object.keys(scripts ?? {})) {
    for (const f of executedTestFiles(scripts, name)) all.add(f)
  }
  return all
}

function loadScripts() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts ?? {}
}

function guardFiles() {
  return readdirSync(GUARD_DIR).filter((f) => f.endsWith('.test.mjs')).sort()
}

test('the argv parser finds the readiness guards (positive control)', () => {
  // If the parser returned nothing, every assertion below would fail loudly
  // rather than pass vacuously — but a parser that silently matched the WRONG
  // thing would not, so its output is checked against a file known to be there.
  const executed = executedTestFiles(loadScripts(), 'verify:readiness')
  assert.ok(
    executed.has('claude-review-security.test.mjs'),
    `parser extracted ${executed.size} executed files from verify:readiness and ` +
      `the security guard was not among them: ${[...executed].join(', ')}`,
  )
})

// ── Runs at MODULE TOP LEVEL, deliberately outside any test() ────────────────
//
// Round 5's evasion has a nasty property the finding did not spell out and I
// only saw by running it: `node --test --test-name-pattern='a^' <every guard>`
// neutralises the guard that would catch the flag. Planted, the readiness gate
// reported `tests 16, pass 16, fail 0`, exit 0 — sixteen files loaded, every
// assertion inside them filtered away. A check written as a test() cannot catch
// a flag whose whole effect is to skip test()s.
//
// `--test-name-pattern` filters by test NAME; it does not stop the module being
// imported. So this check runs on import, and a throw here fails the file no
// matter what selection flags are in play.
;(function assertReadinessRunsUnfiltered() {
  const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts ?? {}
  const readiness = String(scripts['verify:readiness'] ?? '')
  const offending = tokenize(readiness).filter(isSelectionFlag)
  if (offending.length > 0) {
    throw new Error(
      `verify:readiness carries test-selection flags (${offending.join(', ')}). ` +
        'These can skip every named guard while the command still exits 0, which ' +
        'is indistinguishable from the guards passing. A guard runner filters ' +
        'nothing: it runs everything or it is not the runner.',
    )
  }
})()

test('a filtered node --test invocation does not count as executing anything', () => {
  // Round 5's exact evasion. Both files are named on the command line and the
  // command exits 0, but `a^` matches no test name so nothing runs.
  const filtered = {
    'verify:readiness':
      "node --test --test-name-pattern='a^' scripts/__tests__/claude-review-security.test.mjs " +
      'scripts/__tests__/guard-registration.test.mjs',
  }
  assert.deepEqual(
    [...executedTestFiles(filtered, 'verify:readiness')], [],
    'a test-selection flag can skip every named file while the command still ' +
      'exits 0, so being passed to node --test is not evidence of being run',
  )

  // Positive control: the same command without the flag DOES count, so the
  // rejection above is the flag and not a parser that fails on everything.
  const unfiltered = {
    'verify:readiness':
      'node --test scripts/__tests__/claude-review-security.test.mjs ' +
      'scripts/__tests__/guard-registration.test.mjs',
  }
  assert.equal(executedTestFiles(unfiltered, 'verify:readiness').size, 2)

  for (const flag of ['--test-skip-pattern=.', '--test-only', '--test-shard=1/2']) {
    const variant = { s: `node --test ${flag} scripts/__tests__/claude-review-security.test.mjs` }
    assert.deepEqual(
      [...executedTestFiles(variant, 's')], [],
      `${flag} can prevent the named file's tests from running`,
    )
  }
})

test('every guard file is executed by at least one npm script', () => {
  const scripts = loadScripts()
  const guards = guardFiles()

  // Positive control: if this ever reads zero guards the assertion below would
  // pass vacuously, which is the same class of failure it exists to prevent.
  assert.ok(guards.length > 5, `expected to find guard files, found ${guards.length}`)
  assert.ok(Object.keys(scripts).length > 0, 'no npm scripts found')

  const executed = allExecutedTestFiles(scripts)
  const orphaned = guards.filter((f) => !executed.has(f))

  assert.deepEqual(
    orphaned,
    [],
    'these guards are not EXECUTED by any npm script, so CI never runs them ' +
      '(being mentioned in a script is not being run by one):\n' +
      orphaned.map((f) => `  scripts/__tests__/${f}`).join('\n'),
  )
})

test('the security guard specifically runs in the readiness gate', () => {
  const scripts = loadScripts()
  assert.ok(scripts['verify:readiness'], 'verify:readiness script not found')

  const executed = executedTestFiles(scripts, 'verify:readiness')
  for (const required of [
    'claude-review-security.test.mjs',
    'guard-mutation.test.mjs',
    'guard-registration.test.mjs',
  ]) {
    assert.ok(
      executed.has(required),
      `${required} must be executed by verify:readiness — it protects the job that ` +
        `reviews every future PR, and it was previously orphaned. Executed there: ` +
        `${[...executed].join(', ')}`,
    )
  }
})

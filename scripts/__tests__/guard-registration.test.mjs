// scripts/__tests__/guard-registration.test.mjs
//
// Every guard under scripts/__tests__ must be reachable from an npm script.
//
// This exists because claude-review-security.test.mjs was not. Independent
// review planted `track_progress: true` in the live Claude review step — the
// exact defect that guard was written to catch — and `npm run verify:readiness`
// passed 411 tests, exit 0, because package.json's explicit test list omitted
// the file. Three rounds of hardening that guard had produced something CI
// never executed. A guard nobody runs is worse than no guard, because it reads
// as coverage.
//
// The check is deliberately "reachable from ANY script" rather than "in
// verify:readiness": some guards legitimately have their own runner
// (check:nul-bytes, verify:docs-watch, verify:docs-review). What must never
// happen again is a guard with no runner at all.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const GUARD_DIR = join(ROOT, 'scripts', '__tests__')

test('every guard file is referenced by at least one npm script', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const allScripts = Object.values(pkg.scripts ?? {}).join(' ')

  const guards = readdirSync(GUARD_DIR)
    .filter((f) => f.endsWith('.test.mjs'))
    .sort()

  // Positive control: if this ever reads zero guards the assertion below would
  // pass vacuously, which is the same class of failure it exists to prevent.
  assert.ok(guards.length > 5, `expected to find guard files, found ${guards.length}`)
  assert.ok(allScripts.length > 0, 'no npm scripts found')

  const orphaned = guards.filter((f) => !allScripts.includes(f))

  assert.deepEqual(
    orphaned,
    [],
    'these guards are not run by any npm script, so CI never executes them:\n' +
      orphaned.map((f) => `  scripts/__tests__/${f}`).join('\n'),
  )
})

test('the security guard specifically runs in the readiness gate', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const readiness = String(pkg.scripts?.['verify:readiness'] ?? '')

  assert.ok(readiness.length > 0, 'verify:readiness script not found')
  assert.ok(
    readiness.includes('claude-review-security.test.mjs'),
    'the Claude review security guard must run in verify:readiness — it protects ' +
      'the job that reviews every future PR, and it was previously orphaned',
  )
})

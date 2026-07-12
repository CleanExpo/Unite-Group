import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(REPOSITORY_ROOT, 'scripts', 'check-env.mjs')
const temporaryRoots = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function runWithEnvFile(contents) {
  const root = mkdtempSync(join(tmpdir(), 'nexus-check-env-'))
  temporaryRoots.push(root)
  const envFile = join(root, '.env')
  writeFileSync(envFile, contents)
  return spawnSync(process.execPath, [SCRIPT, '--package', 'autopilot', '--env-file', envFile], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin' },
  })
}

test('a missing dormant OWNEST profile is reported without becoming an activation gate', () => {
  const result = runWithEnvFile('')

  assert.equal(result.status, 0)
  assert.match(result.stdout, /DORMANT\s+0\/16 configured/)
  assert.match(result.stdout, /worker cannot be armed/)
})

test('the canonical dormant defaults pass without credentials', () => {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, '--package', 'autopilot', '--env-file', '.env.example'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
  )

  assert.equal(result.status, 0)
  assert.doesNotMatch(result.stdout + result.stderr, /DORMANT PROFILE POLICY/)
})

test('a live request fails the environment gate without echoing secret values', () => {
  const secret = 'service-role-secret-must-not-leak'
  const result = runWithEnvFile([
    `SUPABASE_SERVICE_ROLE_KEY=${secret}`,
    'CC_OWNEST_LIVE=1',
    '',
  ].join('\n'))

  assert.equal(result.status, 1)
  assert.match(result.stdout, /CC_OWNEST_LIVE must remain 0/)
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret))
})

test('an unqualified Hermes executable fails the dormant profile policy', () => {
  const result = runWithEnvFile('CC_OWNEST_HERMES_BIN=hermes\n')

  assert.equal(result.status, 1)
  assert.match(result.stdout, /CC_OWNEST_HERMES_BIN must be an absolute path/)
})

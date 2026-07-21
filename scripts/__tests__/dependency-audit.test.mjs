import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const RUNNER = join(ROOT, 'scripts', 'audit-active-lockfiles.mjs')
const EXPECTED_LOCKS = [
  'apps/autopilot-runner/package-lock.json',
  'apps/empire/package-lock.json',
  'apps/spec-board/package-lock.json',
  'apps/web/.portfolio/package-lock.json',
  'apps/web/pnpm-lock.yaml',
  'apps/workspace/pnpm-lock.yaml',
  'packages/pi-ceo-operator-mcp/package-lock.json',
  'packages/spine/packages/spine/package-lock.json',
  'packages/unite-control-module/package-lock.json',
]
const EXPECTED_ENTRIES = EXPECTED_LOCKS.map((lockfile) => ({
  manager: lockfile.endsWith('pnpm-lock.yaml') ? 'pnpm' : 'npm',
  workspace: dirname(lockfile),
  lockfile,
}))

async function loadRunner() {
  return import(pathToFileURL(RUNNER).href)
}

test('dependency audit discovers every tracked JavaScript lock instead of relying on a static allowlist', async () => {
  const { discoverTrackedLockfiles } = await loadRunner()
  const discovered = await discoverTrackedLockfiles({ root: ROOT })
  const actual = discovered.map(({ lockfile }) => lockfile).sort()
  assert.deepEqual(actual, EXPECTED_LOCKS)
  assert.equal(new Set(actual).size, EXPECTED_LOCKS.length)
})

test('dependency audit collects a machine-readable result for every lock after an early failure', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const visited = []
  const result = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    runAudit: async (entry) => {
      visited.push(entry.lockfile)
      if (visited.length === 1) {
        return { exitCode: 1, stdout: '{"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":1,"critical":0}}}', stderr: '' }
      }
      return { exitCode: 0, stdout: '{"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":0,"critical":0}}}', stderr: '' }
    },
  })

  assert.deepEqual(visited, EXPECTED_LOCKS)
  assert.equal(result.results.length, EXPECTED_LOCKS.length)
  assert.equal(result.passed, false)
  assert.equal(result.results.at(-1).status, 'passed')
})

test('an apps/empire high finding fails the aggregate even when every other lock passes', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const result = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    runAudit: async (entry) => ({
      exitCode: entry.lockfile === 'apps/empire/package-lock.json' ? 1 : 0,
      stdout: JSON.stringify({
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 0,
            moderate: 0,
            high: entry.lockfile === 'apps/empire/package-lock.json' ? 1 : 0,
            critical: 0,
            total: entry.lockfile === 'apps/empire/package-lock.json' ? 1 : 0,
          },
        },
      }),
      stderr: '',
    }),
  })

  assert.equal(result.passed, false)
  assert.equal(result.results.length, EXPECTED_LOCKS.length)
  const empire = result.results.find(({ lockfile }) => lockfile === 'apps/empire/package-lock.json')
  assert.equal(empire.status, 'failed')
  assert.equal(empire.vulnerabilities.high, 1)
})

test('scanner errors fail closed without suppressing later lock results', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const result = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    runAudit: async (entry) => entry.lockfile === EXPECTED_LOCKS[0]
      ? { exitCode: 2, stdout: 'not-json', stderr: 'scanner unavailable' }
      : { exitCode: 0, stdout: '{"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":0,"critical":0}}}', stderr: '' },
  })

  assert.equal(result.passed, false)
  assert.equal(result.results.length, EXPECTED_LOCKS.length)
  assert.equal(result.results[0].status, 'error')
  assert.match(result.results[0].error, /JSON/i)
})

test('structurally incomplete scanner JSON fails closed instead of normalising missing counts to zero', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const result = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    runAudit: async (entry) => entry.lockfile === EXPECTED_LOCKS[0]
      ? { exitCode: 0, stdout: '{}', stderr: '' }
      : { exitCode: 0, stdout: '{"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":0,"critical":0}}}', stderr: '' },
  })

  assert.equal(result.passed, false)
  assert.equal(result.results.length, EXPECTED_LOCKS.length)
  assert.equal(result.results[0].status, 'error')
  assert.match(result.results[0].error, /metadata\.vulnerabilities/)
})

test('an empty tracked-lock inventory fails closed', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const result = await runActiveLockfileAudits({ entries: [] })

  assert.equal(result.passed, false)
  assert.equal(result.results.length, 0)
  assert.match(result.inventoryError, /No tracked JavaScript lockfiles/)
})

test('CI runs the aggregate audit and always persists its result matrix', async () => {
  const ci = await readFile(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
  const job = ci.match(/\n  dependency-audit:\n([\s\S]*?)\n  mcp:/)?.[1]
  assert.ok(job, 'expected dependency-audit job')
  assert.match(job, /node scripts\/audit-active-lockfiles\.mjs --output dependency-audit-results\.json/)
  assert.match(job, /if:\s*always\(\)/)
  assert.match(job, /path:\s*dependency-audit-results\.json/)
  const runCommands = job.split(/\r?\n/).filter((line) => /^\s*run:/.test(line)).join('\n')
  assert.doesNotMatch(runCommands, /npm audit --prefix|pnpm@11\.13\.0[^\n]*audit/)
})

test('the CLI path parses --output, audits all locks, writes every result, and returns aggregate failure', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-dependency-audit-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const { main } = await loadRunner()
  const reportPath = join(root, 'result.json')
  const visited = []
  const exitCode = await main({
    argv: ['--output', reportPath],
    entries: EXPECTED_ENTRIES,
    root: ROOT,
    stdout: { write() {} },
    runAudit: async (entry) => {
      visited.push(entry.lockfile)
      const failed = entry.lockfile === 'apps/empire/package-lock.json'
      return {
        exitCode: failed ? 1 : 0,
        stdout: JSON.stringify({
          metadata: {
            vulnerabilities: {
              info: 0,
              low: 0,
              moderate: 0,
              high: failed ? 1 : 0,
              critical: 0,
              total: failed ? 1 : 0,
            },
          },
        }),
        stderr: '',
      }
    },
  })
  const stored = JSON.parse(await readFile(reportPath, 'utf8'))
  assert.equal(exitCode, 1)
  assert.deepEqual(visited, EXPECTED_LOCKS)
  assert.equal(stored.results.length, EXPECTED_LOCKS.length)
  assert.equal(stored.passed, false)
  assert.equal(stored.results.find(({ lockfile }) => lockfile === 'apps/empire/package-lock.json').status, 'failed')
  assert.equal(stored.results.at(-1).status, 'passed')
})

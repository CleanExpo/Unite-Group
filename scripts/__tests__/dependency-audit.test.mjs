import assert from 'node:assert/strict'
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
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
const CLEAN_AUDIT = JSON.stringify({
  metadata: {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
  },
})

async function loadRunner() {
  return import(pathToFileURL(RUNNER).href)
}

async function makeFixture(t, { locks = ['app/package-lock.json'], manifest = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'nexus-dependency-audit-fixture-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const lockfile of locks) {
    const workspace = join(root, dirname(lockfile))
    await mkdir(workspace, { recursive: true })
    await writeFile(join(root, lockfile), '{}\n')
    await writeFile(join(workspace, 'package.json'), `${JSON.stringify(manifest)}\n`)
  }
  return root
}

function trackedFiles(...lockfiles) {
  return async () => ({ stdout: `${lockfiles.join('\0')}\0` })
}

test('dependency audit discovers every tracked JavaScript lock instead of relying on a static allowlist', async () => {
  const { discoverTrackedLockfiles } = await loadRunner()
  const discovered = await discoverTrackedLockfiles({ root: ROOT })
  const actual = discovered.map(({ lockfile }) => lockfile).sort()
  assert.deepEqual(actual, EXPECTED_LOCKS)
  assert.equal(new Set(actual).size, EXPECTED_LOCKS.length)
})

test('discovery represents npm shrinkwrap plus unsupported yarn and bun locks instead of omitting them', async () => {
  const { discoverTrackedLockfiles } = await loadRunner()
  const discovered = await discoverTrackedLockfiles({
    runGit: trackedFiles('npm/npm-shrinkwrap.json', 'yarn/yarn.lock', 'bun/bun.lock', 'bun-binary/bun.lockb'),
  })

  assert.deepEqual(discovered.map(({ lockfile, manager, supported }) => ({ lockfile, manager, supported })), [
    { lockfile: 'bun-binary/bun.lockb', manager: 'bun', supported: false },
    { lockfile: 'bun/bun.lock', manager: 'bun', supported: false },
    { lockfile: 'npm/npm-shrinkwrap.json', manager: 'npm', supported: true },
    { lockfile: 'yarn/yarn.lock', manager: 'yarn', supported: false },
  ])
})

test('a mixed supported and unsupported inventory fails while still auditing the supported npm lock', async (t) => {
  const root = await makeFixture(t, { locks: ['npm/package-lock.json', 'yarn/yarn.lock'] })
  const { discoverTrackedLockfiles, runActiveLockfileAudits } = await loadRunner()
  const entries = await discoverTrackedLockfiles({ root, runGit: trackedFiles('npm/package-lock.json', 'yarn/yarn.lock') })
  const visited = []
  const report = await runActiveLockfileAudits({
    root,
    entries,
    runAudit: async (entry) => {
      visited.push(entry.lockfile)
      return { exitCode: 0, stdout: CLEAN_AUDIT, stderr: '' }
    },
  })

  assert.deepEqual(visited, ['npm/package-lock.json'])
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /yarn\.lock.*unsupported/i)
  assert.equal(report.results.find(({ lockfile }) => lockfile === 'yarn/yarn.lock').status, 'error')
})

test('an unsupported-only inventory fails without invoking a scanner', async (t) => {
  const root = await makeFixture(t, { locks: ['bun/bun.lock'] })
  const { discoverTrackedLockfiles, runActiveLockfileAudits } = await loadRunner()
  const entries = await discoverTrackedLockfiles({ root, runGit: trackedFiles('bun/bun.lock') })
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries,
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.equal(report.results.length, 1)
  assert.match(report.inventoryError, /unsupported/i)
})

test('npm shrinkwrap is treated as a supported npm audit input', async (t) => {
  const root = await makeFixture(t, { locks: ['npm/npm-shrinkwrap.json'] })
  const { discoverTrackedLockfiles, runActiveLockfileAudits } = await loadRunner()
  const entries = await discoverTrackedLockfiles({ root, runGit: trackedFiles('npm/npm-shrinkwrap.json') })
  const visited = []
  const report = await runActiveLockfileAudits({
    root,
    entries,
    runAudit: async (entry) => {
      visited.push(entry)
      return { exitCode: 0, stdout: CLEAN_AUDIT, stderr: '' }
    },
  })

  assert.equal(report.passed, true)
  assert.equal(visited.length, 1)
  assert.equal(visited[0].manager, 'npm')
})

test('missing package.json fails before scanner execution', async (t) => {
  const root = await makeFixture(t)
  await rm(join(root, 'app', 'package.json'))
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [{ manager: 'npm', workspace: 'app', lockfile: 'app/package-lock.json' }],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /package\.json.*missing|missing.*package\.json/i)
})

test('a missing tracked lockfile fails before scanner execution', async (t) => {
  const root = await makeFixture(t)
  await rm(join(root, 'app', 'package-lock.json'))
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [{ manager: 'npm', workspace: 'app', lockfile: 'app/package-lock.json' }],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /Lockfile.*missing/i)
})

test('malformed and non-object package manifests fail before scanner execution', async (t) => {
  const root = await makeFixture(t, { locks: ['bad/package-lock.json', 'array/package-lock.json'] })
  await writeFile(join(root, 'bad', 'package.json'), '{not-json')
  await writeFile(join(root, 'array', 'package.json'), '[]\n')
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [
      { manager: 'npm', workspace: 'bad', lockfile: 'bad/package-lock.json' },
      { manager: 'npm', workspace: 'array', lockfile: 'array/package-lock.json' },
    ],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /valid JSON/i)
  assert.match(report.inventoryError, /JSON object/i)
})

test('lockfile and manifest symlinks fail before scanner execution', async (t) => {
  const root = await makeFixture(t, { locks: ['lock-link/package-lock.json', 'manifest-link/package-lock.json'] })
  await writeFile(join(root, 'external-lock.json'), '{}\n')
  await rm(join(root, 'lock-link', 'package-lock.json'))
  await symlink(join(root, 'external-lock.json'), join(root, 'lock-link', 'package-lock.json'))
  await writeFile(join(root, 'external-package.json'), '{}\n')
  await rm(join(root, 'manifest-link', 'package.json'))
  await symlink(join(root, 'external-package.json'), join(root, 'manifest-link', 'package.json'))
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [
      { manager: 'npm', workspace: 'lock-link', lockfile: 'lock-link/package-lock.json' },
      { manager: 'npm', workspace: 'manifest-link', lockfile: 'manifest-link/package-lock.json' },
    ],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /lockfile.*symbolic link/i)
  assert.match(report.inventoryError, /package\.json.*symbolic link/i)
})

test('a realpath escape through a symlinked workspace fails before scanner execution', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-dependency-audit-root-'))
  const outside = await mkdtemp(join(tmpdir(), 'nexus-dependency-audit-outside-'))
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(outside, { recursive: true, force: true }),
  ]))
  await writeFile(join(outside, 'package-lock.json'), '{}\n')
  await writeFile(join(outside, 'package.json'), '{}\n')
  await symlink(outside, join(root, 'escaped'))
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [{ manager: 'npm', workspace: 'escaped', lockfile: 'escaped/package-lock.json' }],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /outside repository root/i)
})

test('entry manager drift, manifest manager drift, and duplicate lock entries fail closed', async (t) => {
  const root = await makeFixture(t, { manifest: { packageManager: 'pnpm@9.15.0' } })
  const entry = { manager: 'pnpm', workspace: 'app', lockfile: 'app/package-lock.json' }
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [entry, entry],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /manager.*npm/i)
  assert.match(report.inventoryError, /packageManager.*pnpm.*npm|npm.*packageManager.*pnpm/i)
  assert.match(report.inventoryError, /duplicate/i)
})

test('colliding lock formats in one workspace fail before either scanner invocation', async (t) => {
  const root = await makeFixture(t, { locks: ['app/package-lock.json', 'app/npm-shrinkwrap.json'] })
  const { runActiveLockfileAudits } = await loadRunner()
  let calls = 0
  const report = await runActiveLockfileAudits({
    root,
    entries: [
      { manager: 'npm', workspace: 'app', lockfile: 'app/package-lock.json' },
      { manager: 'npm', workspace: 'app', lockfile: 'app/npm-shrinkwrap.json' },
    ],
    runAudit: async () => { calls += 1 },
  })

  assert.equal(calls, 0)
  assert.equal(report.passed, false)
  assert.match(report.inventoryError, /colliding lockfiles.*workspace app/i)
})

test('audit evidence distinguishes workflow SHA, pull-request head SHA, and git tree', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const report = await runActiveLockfileAudits({
    entries: [],
    evidence: {
      githubSha: 'merge-sha',
      pullRequestHeadSha: 'head-sha',
      gitTree: 'tree-sha',
    },
  })

  assert.equal(report.schema, 'unite-active-lockfile-audit-v2')
  assert.equal(report.githubSha, 'merge-sha')
  assert.equal(report.pullRequestHeadSha, 'head-sha')
  assert.equal(report.gitTree, 'tree-sha')
  assert.equal(Object.hasOwn(report, 'headSha'), false)
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

test('Windows audit scanners launch npm and corepack JavaScript entrypoints through Node with isolated argv', async () => {
  const { buildAuditInvocation } = await loadRunner()
  assert.equal(typeof buildAuditInvocation, 'function')

  const nodeExecutable = 'C:\\Program Files & Tools\\node.exe'
  assert.deepEqual(buildAuditInvocation({ manager: 'npm' }, { platform: 'win32', nodeExecutable }), {
    executable: nodeExecutable,
    args: [
      'C:\\Program Files & Tools\\node_modules\\npm\\bin\\npm-cli.js',
      'audit',
      '--package-lock-only',
      '--ignore-scripts',
      '--audit-level=high',
      '--json',
    ],
  })
  assert.deepEqual(buildAuditInvocation({ manager: 'pnpm' }, { platform: 'win32', nodeExecutable }), {
    executable: nodeExecutable,
    args: [
      'C:\\Program Files & Tools\\node_modules\\corepack\\dist\\corepack.js',
      'pnpm@11.13.0',
      '--pm-on-fail=ignore',
      'audit',
      '--audit-level',
      'high',
      '--json',
    ],
  })
})

test('Windows audit execution preserves argv, workspace and bounded timeout without a shell', async () => {
  const { executeAudit } = await loadRunner()
  const calls = []
  const root = join(tmpdir(), 'repo space & metachar')
  const workspace = 'workspace [x] & more'
  const entries = [
    { manager: 'npm', workspace, lockfile: `${workspace}/package-lock.json` },
    { manager: 'pnpm', workspace, lockfile: `${workspace}/pnpm-lock.yaml` },
  ]
  for (const entry of entries) {
    const result = await executeAudit(
      entry,
      {
        root,
        timeoutMs: 321,
        platform: 'win32',
        nodeExecutable: 'C:\\Program Files & Tools\\node.exe',
        runExec: async (...call) => {
          calls.push(call)
          return { stdout: CLEAN_AUDIT, stderr: '' }
        },
      },
    )
    assert.equal(result.exitCode, 0)
  }

  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map(([executable, args]) => ({ executable, args })), [{
    executable: 'C:\\Program Files & Tools\\node.exe',
    args: [
      'C:\\Program Files & Tools\\node_modules\\npm\\bin\\npm-cli.js',
      'audit',
      '--package-lock-only',
      '--ignore-scripts',
      '--audit-level=high',
      '--json',
    ],
  }, {
    executable: 'C:\\Program Files & Tools\\node.exe',
    args: [
      'C:\\Program Files & Tools\\node_modules\\corepack\\dist\\corepack.js',
      'pnpm@11.13.0',
      '--pm-on-fail=ignore',
      'audit',
      '--audit-level',
      'high',
      '--json',
    ],
  }])
  for (const [, , options] of calls) {
    assert.equal(options.cwd, resolve(root, workspace))
    assert.equal(options.timeout, 321)
    assert.equal(Object.hasOwn(options, 'shell'), false)
  }
})

test('a timed-out scanner becomes an error while later locks run and the report persists', async (t) => {
  const root = await makeFixture(t, {
    locks: ['stalled/package-lock.json', 'later/package-lock.json'],
  })
  const bin = join(root, 'bin')
  await mkdir(bin)
  const fakeNpm = join(bin, 'npm')
  await writeFile(fakeNpm, `#!/usr/bin/env node
const clean = ${JSON.stringify(CLEAN_AUDIT)}
if (process.cwd().split(/[\\\\/]/).at(-1) === 'stalled') {
  setTimeout(() => process.stdout.write(clean), 1000)
} else {
  process.stdout.write(clean)
}
`)
  await chmod(fakeNpm, 0o755)

  const originalPath = process.env.PATH
  process.env.PATH = `${bin}${delimiter}${originalPath}`
  t.after(() => { process.env.PATH = originalPath })

  const { executeAudit, main } = await loadRunner()
  const reportPath = join(root, 'result.json')
  const startedAt = Date.now()
  const exitCode = await main({
    argv: ['--output', reportPath],
    entries: [
      { manager: 'npm', workspace: 'stalled', lockfile: 'stalled/package-lock.json' },
      { manager: 'npm', workspace: 'later', lockfile: 'later/package-lock.json' },
    ],
    root,
    stdout: { write() {} },
    runAudit: (entry, options) => executeAudit(entry, { ...options, timeoutMs: 250 }),
  })
  const elapsedMs = Date.now() - startedAt
  const stored = JSON.parse(await readFile(reportPath, 'utf8'))

  assert.equal(exitCode, 1)
  assert.ok(elapsedMs < 750, `scanner timeout took ${elapsedMs}ms`)
  assert.equal(stored.results.length, 2)
  assert.equal(stored.results[0].status, 'error')
  assert.match(stored.results[0].error, /timed out/i)
  assert.equal(stored.results[0].timeoutMs, 250)
  assert.equal(stored.results[1].status, 'passed')
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
  assert.match(job, /timeout-minutes:\s*\d+/)
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

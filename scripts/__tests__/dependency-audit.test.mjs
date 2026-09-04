import assert from 'node:assert/strict'
import { chmod, copyFile, link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
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

/**
 * Put `source` where the runner will actually invoke it, and return the options
 * that reach it.
 *
 * The seam differs by platform, and using the wrong one silently runs the real
 * npm against the fixture instead of the stub. Off Windows the runner resolves
 * `npm` from PATH. On Windows buildAuditInvocation() deliberately bypasses PATH
 * and spawns `<dirname(nodeExecutable)>/node_modules/npm/bin/npm-cli.js`, so a
 * PATH shim cannot intercept it — and an extensionless shebang file is not
 * executable there anyway.
 */
async function installStubScanner(t, bin, source) {
  if (process.platform !== 'win32') {
    await mkdir(bin, { recursive: true })
    const stub = join(bin, 'npm')
    await writeFile(stub, source)
    await chmod(stub, 0o755)
    const originalPath = process.env.PATH
    process.env.PATH = `${bin}${delimiter}${originalPath}`
    t.after(() => { process.env.PATH = originalPath })
    return {}
  }

  const cli = join(bin, 'node_modules', 'npm', 'bin', 'npm-cli.js')
  await mkdir(dirname(cli), { recursive: true })
  await writeFile(cli, source)
  const nodeExecutable = join(bin, 'node.exe')
  try {
    await link(process.execPath, nodeExecutable)
  } catch {
    await copyFile(process.execPath, nodeExecutable)
  }
  return { nodeExecutable }
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
  /*
   * EVERY MARGIN HERE IS WIDE ON PURPOSE, AND THE FIRST DIAGNOSIS WAS WRONG.
   *
   * This test ran a 250ms scanner timeout against a 1000ms stall and asserted
   * `elapsedMs < 750`. It passed for months alongside six sibling files, then
   * failed 1 run in 5 once UNI-2567 added ~120 tests to the same `node --test`
   * process. Measured, not guessed: 0/10 failures on origin/main, 1/5 at that
   * head. Nothing about the behaviour changed — the machine got busier.
   *
   * I first widened only the STALL, and it failed again. Reading the assertion
   * instead of assuming showed the real one: `results[1].status` — the HEALTHY
   * scanner, the one that writes immediately — came back `error`. Every scanner
   * here is a real spawned Node process, and spawning one on a loaded machine
   * can exceed 250ms by itself. The timeout was firing on a scanner that had
   * done nothing wrong, so the test was measuring process-start latency.
   *
   * The property is "the timeout fires and we do NOT wait out the scanner", and
   * widening the TOLERANCE would weaken it. Widening every GAP keeps it exactly
   * as strong and makes it decidable in both directions: 1500ms is far above any
   * plausible spawn and far below the 8000ms stall, and the 4000ms bound is
   * unreachable by a run that waited the stall out. No scheduler jitter moves a
   * result across those lines.
   */
  const injection = await installStubScanner(t, join(root, 'bin'), `#!/usr/bin/env node
const clean = ${JSON.stringify(CLEAN_AUDIT)}
if (process.cwd().split(/[\\\\/]/).at(-1) === 'stalled') {
  setTimeout(() => process.stdout.write(clean), 8000)
} else {
  process.stdout.write(clean)
}
`)

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
    /*
     * 1500ms, NOT 250ms, AND THE 250 WAS THE ACTUAL FLAKE.
     *
     * The failure under load was `results[1].status` — the HEALTHY scanner, the
     * one that writes immediately — coming back `error` instead of `passed`.
     * Every scanner here is a real spawned Node process, and spawning one on a
     * busy machine can take longer than 250ms on its own. So the timeout was
     * firing on a scanner that had done nothing wrong, and the test was
     * measuring process-start latency rather than timeout behaviour.
     *
     * Widening the stall alone did not fix it, because the stall is the OTHER
     * side of this test. Both margins have to hold at once: 1500ms is far above
     * any plausible spawn under load and far below the 8000ms stall, so the
     * healthy scanner always finishes and the stalled one always times out.
     */
    runAudit: (entry, options) => executeAudit(entry, { ...options, ...injection, timeoutMs: 1500 }),
  })
  const elapsedMs = Date.now() - startedAt
  const stored = JSON.parse(await readFile(reportPath, 'utf8'))

  assert.equal(exitCode, 1)
  // Half the 8000ms stall: unreachable by a run that waited it out, and far
  // above the 1500ms timeout plus any spawn overhead in a run that did not.
  assert.ok(elapsedMs < 4000, `scanner timeout took ${elapsedMs}ms`)
  assert.equal(stored.results.length, 2)
  assert.equal(stored.results[0].status, 'error')
  assert.match(stored.results[0].error, /timed out/i)
  assert.equal(stored.results[0].timeoutMs, 1500)
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

// On 04/09/2026 seven of nine workspaces exceeded the 60s scanner budget and the job
// reported `passed: false` with every vulnerability count at zero. It had not failed;
// it had not finished. The tests below pin the two properties that distinction needs:
// a scan that did not run can never mean pass, and it must be visible as a timeout
// rather than indistinguishable from a clean run.

test('a timed-out scan can never report a passing aggregate, even when every other lock is clean', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const timedOutLock = 'apps/web/pnpm-lock.yaml'
  const report = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    runAudit: async (entry) => (entry.lockfile === timedOutLock
      ? { exitCode: 2, stdout: '', stderr: 'killed', timedOut: true, timeoutMs: 300_000 }
      : { exitCode: 0, stdout: CLEAN_AUDIT, stderr: '', timedOut: false }),
  })

  const timedOut = report.results.find(({ lockfile }) => lockfile === timedOutLock)
  assert.equal(timedOut.timedOut, true)
  assert.equal(timedOut.status, 'error')
  assert.deepEqual(timedOut.vulnerabilities, {
    info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0,
  })
  // Every other lock is clean, so nothing but the timeout can be holding this closed.
  assert.equal(report.results.filter(({ status }) => status === 'passed').length,
    EXPECTED_LOCKS.length - 1)
  assert.equal(report.passed, false)
})

test('a timeout is machine-distinguishable from a clean scan and from other error classes', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const report = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    runAudit: async (entry) => {
      if (entry.lockfile === 'apps/empire/package-lock.json') {
        return { exitCode: 2, stdout: '', stderr: 'killed', timedOut: true, timeoutMs: 300_000 }
      }
      if (entry.lockfile === 'apps/spec-board/package-lock.json') {
        return { exitCode: 0, stdout: 'not json at all', stderr: '', timedOut: false }
      }
      return { exitCode: 0, stdout: CLEAN_AUDIT, stderr: '', timedOut: false }
    },
  })

  const timeout = report.results.find(({ lockfile }) => lockfile === 'apps/empire/package-lock.json')
  const parseFailure = report.results.find(({ lockfile }) => lockfile === 'apps/spec-board/package-lock.json')
  const clean = report.results.find(({ lockfile }) => lockfile === 'apps/workspace/pnpm-lock.yaml')

  // `status` alone cannot separate these two: both are 'error'. That is precisely why
  // the timeout needs its own field — the 04/09 incident was misread as a finding.
  assert.equal(timeout.status, 'error')
  assert.equal(parseFailure.status, 'error')
  assert.equal(timeout.timedOut, true)
  assert.equal(parseFailure.timedOut, false)
  assert.equal(clean.timedOut, false)
  assert.equal(clean.status, 'passed')
  assert.match(timeout.error, /timed out after 300000ms/)
  assert.equal(report.passed, false)
})

test('concurrent scans preserve inventory order and actually overlap', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  let inFlight = 0
  let peakInFlight = 0
  const report = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    concurrency: 5,
    // Reversed latency: the first entry is slowest, the last is fastest. A pool that
    // pushed as workers completed would emit these close to backwards.
    runAudit: async (entry) => {
      inFlight += 1
      peakInFlight = Math.max(peakInFlight, inFlight)
      const index = EXPECTED_LOCKS.indexOf(entry.lockfile)
      await new Promise((done) => { setTimeout(done, (EXPECTED_LOCKS.length - index) * 4) })
      inFlight -= 1
      return { exitCode: 0, stdout: CLEAN_AUDIT, stderr: '', timedOut: false }
    },
  })

  assert.deepEqual(report.results.map(({ lockfile }) => lockfile), EXPECTED_LOCKS)
  assert.equal(report.results.length, EXPECTED_LOCKS.length)
  assert.equal(report.passed, true)
  // Positive control on the concurrency itself: if this were still serial the peak
  // would be 1, and the order assertion above would prove nothing about ordering.
  assert.ok(peakInFlight > 1, `expected overlapping scans, peak in-flight was ${peakInFlight}`)
  assert.ok(peakInFlight <= 5, `concurrency cap breached, peak in-flight was ${peakInFlight}`)
})

test('a worker that leaves its slot unfilled fails the aggregate closed', async () => {
  const { runActiveLockfileAudits } = await loadRunner()
  const report = await runActiveLockfileAudits({
    entries: EXPECTED_ENTRIES,
    concurrency: 3,
    runAudit: async (entry) => (entry.lockfile === 'apps/empire/package-lock.json'
      ? undefined
      : { exitCode: 0, stdout: CLEAN_AUDIT, stderr: '', timedOut: false }),
  })

  // `Array.prototype.every` skips holes, so a sparse or undefined-bearing results array
  // would satisfy a naive predicate vacuously. This must never read as a pass.
  assert.equal(report.passed, false)
})

test('scanner budget and concurrency come from the environment and reject garbage', async () => {
  const { readPositiveIntegerEnv, DEFAULT_SCANNER_TIMEOUT_MS, DEFAULT_SCANNER_CONCURRENCY } = await loadRunner()

  // Falls back when unset or empty.
  assert.equal(readPositiveIntegerEnv('AUDIT_SCANNER_TIMEOUT_MS', DEFAULT_SCANNER_TIMEOUT_MS, { env: {} }),
    DEFAULT_SCANNER_TIMEOUT_MS)
  assert.equal(readPositiveIntegerEnv('AUDIT_SCANNER_CONCURRENCY', DEFAULT_SCANNER_CONCURRENCY,
    { env: { AUDIT_SCANNER_CONCURRENCY: '' } }), DEFAULT_SCANNER_CONCURRENCY)

  // Honours a valid override.
  assert.equal(readPositiveIntegerEnv('AUDIT_SCANNER_TIMEOUT_MS', 300_000,
    { env: { AUDIT_SCANNER_TIMEOUT_MS: '90000' } }), 90_000)

  // Rejects rather than silently defaulting. A budget nobody chose is how this broke.
  for (const bad of ['abc', '0', '-1', '1.5', '12abc', ' ']) {
    assert.throws(
      () => readPositiveIntegerEnv('AUDIT_SCANNER_TIMEOUT_MS', 300_000, { env: { AUDIT_SCANNER_TIMEOUT_MS: bad } }),
      TypeError,
      `expected ${JSON.stringify(bad)} to be rejected`,
    )
  }
})

test('worst-case wall clock fits the CI job budget at the shipped defaults', async () => {
  const {
    DEFAULT_SCANNER_TIMEOUT_MS, DEFAULT_SCANNER_CONCURRENCY, CI_JOB_BUDGET_MS,
  } = await loadRunner()

  const waves = Math.ceil(EXPECTED_LOCKS.length / DEFAULT_SCANNER_CONCURRENCY)
  const worstCaseMs = waves * DEFAULT_SCANNER_TIMEOUT_MS

  // Every scan can time out and the job must still return a report rather than being
  // killed by the runner — a job the runner kills produces no artifact to read.
  assert.ok(
    worstCaseMs < CI_JOB_BUDGET_MS,
    `worst case ${worstCaseMs}ms across ${waves} waves exceeds the ${CI_JOB_BUDGET_MS}ms job cap`,
  )
  // Raising the per-scan budget past the point where it no longer fits must break this
  // test, not surface as a killed job three weeks later.
  assert.ok(DEFAULT_SCANNER_TIMEOUT_MS > 60_000, 'the budget that failed on 04/09 must not be restored')
})

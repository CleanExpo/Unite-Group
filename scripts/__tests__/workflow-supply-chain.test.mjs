import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { findSystemShell } from './helpers/posix-shell.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const WORKFLOWS = join(ROOT, '.github', 'workflows')
const execFileAsync = promisify(execFile)

// The interpreter is absolute on every platform: these tests hand the script a
// PATH containing a fake `bash`, so a PATH-resolved one would run the
// attacker's shim and quietly invert what the test proves.
const SHELL = findSystemShell()

// The dirty-checkout case additionally needs a real /usr/bin/git, which the
// script pins so an attacker-controlled PATH cannot substitute git. Git Bash
// has none, so that one resolves its own shell and lands on WSL here.
const GIT_SHELL = findSystemShell(['/usr/bin/git'])

// Reason strings, not booleans — node:test prints them beside the skip, so an
// unrunnable guard can never be mistaken for a green one. And `false`, never
// `null`: node:test runs the body for `skip: null` but still reports SKIP,
// which would hide a genuine pass behind a skip marker.
const NO_SHELL = SHELL ? false : 'no POSIX shell on this machine (set GIT_BASH to override)'
const NO_GIT_SHELL = GIT_SHELL
  ? false
  : 'no shell here resolves /usr/bin/git — Git Bash ships git as /mingw64/bin/git, and no WSL distribution qualified'

/**
 * Three tests below hand `start-operator.sh` a fake `node` on PATH that forwards
 * `-e` to `process.execPath`. That makes the launcher's Node-range check test
 * THIS runner's Node rather than the machine's — and the launcher requires
 * `>=24.14.1 <25`, which package.json also declares as the repo's engine.
 *
 * Run them on Node 22 and all three fail with "Node >=24.14.1 <25 is required",
 * which reads as three broken SECURITY tests rather than a wrong interpreter.
 * That misdirection has already cost real debugging time here, and it blocks the
 * PR release gate, whose hook runs the readiness suite with whatever `node` is
 * on the default PATH.
 *
 * Same idiom as NO_SHELL above: node:test prints the reason beside the skip, so
 * an unrunnable guard can never be mistaken for a green one. CI pins Node 24, so
 * these still execute where the guarantee has to hold — this only stops a wrong
 * local interpreter from fabricating a security failure.
 */
const [NODE_MAJOR, NODE_MINOR, NODE_PATCH] = process.versions.node.split('.').map(Number)
const NODE_IN_RANGE =
  NODE_MAJOR === 24 && (NODE_MINOR > 14 || (NODE_MINOR === 14 && NODE_PATCH >= 1))
const WRONG_NODE = NODE_IN_RANGE
  ? false
  : `this runner is Node ${process.versions.node}; start-operator.sh requires >=24.14.1 <25 (package.json engines) and the fake node shim forwards its version check to THIS runner — a failure here would be the interpreter, not the launcher`

/** Run a committed .sh under `shell`, in that shell's own path dialect. */
function runIn(shell, scriptPath, env) {
  return execFileAsync(...shell.spawnArgs(scriptPath, env))
}

/** Run under the default shell (Git Bash on Windows, /bin/bash elsewhere). */
function runScript(scriptPath, env) {
  return runIn(SHELL, scriptPath, env)
}

/** Path in the default shell's dialect — for fixtures the script will read. */
const toPath = (value) => (SHELL ? SHELL.toPath(value) : value)

test('every root GitHub Action is pinned to an immutable commit or image digest', async () => {
  const files = (await readdir(WORKFLOWS)).filter((name) => /\.ya?ml$/i.test(name)).sort()
  assert.ok(files.length > 0)

  const unpinned = []
  let actionCount = 0
  for (const file of files) {
    const lines = (await readFile(join(WORKFLOWS, file), 'utf8')).split(/\r?\n/)
    lines.forEach((line, index) => {
      const use = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/)?.[1]
      if (!use) return
      actionCount += 1
      if (use.startsWith('./')) return
      if (/^docker:\/\/[^@]+@sha256:[a-f0-9]{64}$/i.test(use)) return
      if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+@[a-f0-9]{40}$/i.test(use)) return
      if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}$/i.test(use)) return
      unpinned.push(`${file}:${index + 1}:${use}`)
    })
  }

  assert.ok(actionCount > 0)
  assert.deepEqual(unpinned, [], `mutable action references:\n${unpinned.join('\n')}`)
})

test('the E2E job cannot fall back to production credentials', async () => {
  const ci = await readFile(join(WORKFLOWS, 'ci.yml'), 'utf8')
  const e2e = ci.match(/\n  e2e:\n([\s\S]*?)\n  spec-board:/)?.[1]
  assert.ok(e2e, 'expected a bounded e2e job in ci.yml')

  const forbiddenProductionSecrets = [
    'secrets.NEXT_PUBLIC_SUPABASE_URL',
    'secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'secrets.SUPABASE_SERVICE_ROLE_KEY',
    'secrets.ANTHROPIC_API_KEY',
    'secrets.VAULT_ENCRYPTION_KEY',
    'secrets.CRON_SECRET',
    'secrets.FOUNDER_USER_ID',
  ]

  for (const secret of forbiddenProductionSecrets) {
    assert.equal(e2e.includes(secret), false, `E2E job references production credential ${secret}`)
  }

  assert.match(e2e, /NEXT_PUBLIC_SUPABASE_URL:\s*\$\{\{ secrets\.E2E_SUPABASE_URL \|\| 'https:\/\/example\.supabase\.co' \}\}/)
  assert.match(e2e, /SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{ secrets\.E2E_SUPABASE_SERVICE_ROLE_KEY \|\| 'ci-placeholder-service-role-key' \}\}/)
})

test('persistent host compose fails closed on missing operator inputs', async () => {
  const compose = await readFile(join(ROOT, 'deploy', 'nexus-host', 'docker-compose.yml'), 'utf8')
  for (const variable of ['API_SERVER_KEY', 'HERMES_PASSWORD', 'VAULT_DIR']) {
    assert.match(
      compose,
      new RegExp(`\\$\\{${variable}:\\?[^}]+\\}`),
      `${variable} must use required Compose interpolation`,
    )
  }
})

test('workspace launchers enforce Node 24 and verify the pinned Hermes installer', async () => {
  const install = await readFile(join(ROOT, 'apps', 'workspace', 'install.sh'), 'utf8')
  const start = await readFile(join(ROOT, 'apps', 'workspace', 'start-operator.sh'), 'utf8')
  const pinnedInstallerPath = join(ROOT, 'apps', 'workspace', 'scripts', 'install-pinned-hermes.sh')
  const pinnedInstaller = await readFile(pinnedInstallerPath, 'utf8')

  for (const [name, source] of [['install.sh', install], ['start-operator.sh', start]]) {
    assert.match(source, /REQUIRED_NODE_RANGE=">=24\.14\.1 <25"/, `${name} must declare the canonical Node range`)
    assert.match(source, /major !== 24/, `${name} must reject every non-24 major`)
  }

  assert.doesNotMatch(start, /API_SERVER_KEY|\bKEY=/, 'the shell launcher must never read or forward the gateway key')
  assert.match(start, /exec \/usr\/bin\/env -i/)
  assert.match(start, /"\$NODE_BIN" "\$OPERATOR_ENTRY"/)
  assert.match(start, /\/usr\/bin\/perl -MCwd=realpath/)
  assert.doesNotMatch(install, /curl[\s\S]{0,200}\|\s*bash/, 'installer must not execute an unverified network stream')
  assert.match(install, /SUSPICIOUS_KEYS=/)
  assert.doesNotMatch(install, /echo "\$SUSPICIOUS"/)
  assert.ok(
    install.indexOf('install-pinned-hermes.sh') < install.indexOf('command -v hermes'),
    'the pinned installer must run before an existing hermes command is trusted',
  )
  assert.match(pinnedInstaller, /readonly NOUS_INSTALLER_COMMIT="[a-f0-9]{40}"/)
  assert.match(pinnedInstaller, /readonly NOUS_INSTALLER_SHA256="[a-f0-9]{64}"/)
  assert.doesNotMatch(pinnedInstaller, /NOUS_INSTALLER_(?:COMMIT|SHA256|URL)="\$\{/)
  assert.match(pinnedInstaller, /shasum -a 256/)
  assert.match(pinnedInstaller, /env -i/)
  assert.match(pinnedInstaller, /--commit "\$NOUS_INSTALLER_COMMIT"/)
  assert.match(pinnedInstaller, /verify_installed_commit/)
  assert.match(pinnedInstaller, /readonly SYSTEM_PATH="\/usr\/bin:\/bin:\/usr\/sbin:\/sbin"/)
  assert.match(pinnedInstaller, /\/usr\/bin\/curl/)
  assert.match(pinnedInstaller, /\/bin\/bash "\$installer_tmp"/)
  assert.match(pinnedInstaller, /\[\[ -f "\$entrypoint" && ! -L "\$entrypoint" && -x "\$entrypoint" \]\]/)
  assert.match(pinnedInstaller, /\[\[ "\$actual_launcher" == "\$expected_launcher" \]\]/)
  assert.doesNotMatch(pinnedInstaller, /grep -Fqx .*launcher/)
  assert.match(install, /EXPECTED_HERMES_LAUNCHER/)
  assert.match(install, /if \[\[ "\$resolved_hermes" != "\$EXPECTED_HERMES_LAUNCHER" \]\]/)
  assert.match(install, /PNPM_VERSION="9\.15\.0"/)
  assert.doesNotMatch(install, /npm install -g pnpm(?:\s|$)/, 'installer must not install a floating pnpm version')
  assert.match(install, /npm install -g "pnpm@\$PNPM_VERSION"/)
})

test('a bad pinned Hermes digest cannot execute the downloaded installer', { skip: NO_SHELL }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-hermes-pin-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const bashMarker = join(root, 'bash-executed')
  const curlMarker = join(root, 'curl-executed')
  const hashMarker = join(root, 'hash-executed')
  await mkdir(bin)
  await writeFile(join(bin, 'curl'), `#!/bin/sh\nprintf executed > '${toPath(curlMarker)}'\nexit 1\n`)
  await writeFile(join(bin, 'shasum'), `#!/bin/sh\nprintf executed > '${toPath(hashMarker)}'\nexit 1\n`)
  await writeFile(join(bin, 'bash'), `#!/bin/sh\nprintf executed > '${toPath(bashMarker)}'\n`)
  await chmod(join(bin, 'curl'), 0o755)
  await chmod(join(bin, 'shasum'), 0o755)
  await chmod(join(bin, 'bash'), 0o755)

  const script = join(ROOT, 'apps', 'workspace', 'scripts', 'install-pinned-hermes.sh')
  await assert.rejects(
    runScript(script, {
      HOME: toPath(root),
      PATH: `${toPath(bin)}:/usr/bin:/bin`,
      TMPDIR: toPath(root),
      USER: 'tester',
      SHELL: '/bin/bash',
      TERM: 'dumb',
      NEXUS_HERMES_INSTALLER_TEST_TAMPER: '1',
    }),
    /integrity check failed/i,
  )
  for (const marker of [bashMarker, curlMarker, hashMarker]) {
    await assert.rejects(readFile(marker), { code: 'ENOENT' })
  }
})

test('operator launcher rejects an invalid Node before starting the trusted entry', { skip: NO_SHELL }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-operator-node-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const ranMarker = join(root, 'node-shim-ran')
  await mkdir(bin)
  await writeFile(join(bin, 'node'), `#!/bin/sh\nprintf ran > '${toPath(ranMarker)}'\nexit 1\n`)
  await chmod(join(bin, 'node'), 0o755)

  const script = join(ROOT, 'apps', 'workspace', 'start-operator.sh')
  await assert.rejects(
    runScript(script, { HOME: toPath(root), PATH: `${toPath(bin)}:/usr/bin:/bin` }),
    /Node >=24\.14\.1 <25 is required/,
  )
  // A machine with no node at all produces the same message, which would make
  // the rejection above vacuous. Prove the launcher reached and ran the shim.
  assert.equal(await readFile(ranMarker, 'utf8'), 'ran')
})

test('operator launcher scrubs unrelated ambient secrets', { skip: NO_SHELL || WRONG_NODE }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-operator-env-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const marker = join(root, 'child-env')
  const fakeEnvMarker = join(root, 'fake-env')
  await mkdir(bin)
  await writeFile(join(bin, 'node'), `#!/bin/sh\nif [ "$1" = '-e' ]; then exec '${toPath(process.execPath)}' "$@"; fi\nprintf 'arg=%s\\n' "$1" > '${toPath(marker)}'\n/usr/bin/env >> '${toPath(marker)}'\n`)
  await writeFile(join(bin, 'env'), `#!/bin/sh\nprintf executed > '${toPath(fakeEnvMarker)}'\nexit 1\n`)
  await chmod(join(bin, 'node'), 0o755)
  await chmod(join(bin, 'env'), 0o755)

  const script = join(ROOT, 'apps', 'workspace', 'start-operator.sh')
  await runScript(script, {
    HOME: toPath(root),
    PATH: `${toPath(bin)}:/usr/bin:/bin`,
    SHELL: '/bin/bash',
    TMPDIR: toPath(root),
    TOP_SECRET_SENTINEL: 'must-not-cross-boundary',
  })
  const childEnv = await readFile(marker, 'utf8')
  assert.doesNotMatch(childEnv, /TOP_SECRET_SENTINEL/)
  assert.doesNotMatch(childEnv, /HERMES_API_TOKEN|test-gateway-key/)
  assert.match(childEnv, /arg=.*operator-entry\.js/)
  await assert.rejects(readFile(fakeEnvMarker), { code: 'ENOENT' })
})

test('operator launcher resolves a symlink before exposing the gateway key', { skip: NO_SHELL || WRONG_NODE }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-operator-symlink-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const attacker = join(root, 'attacker')
  const marker = join(root, 'launch')
  const realScript = join(ROOT, 'apps', 'workspace', 'start-operator.sh')
  const expectedDir = join(ROOT, 'apps', 'workspace')
  await mkdir(bin)
  await mkdir(attacker)
  await writeFile(join(attacker, 'server-entry.js'), 'throw new Error("attacker-controlled")\n')
  await writeFile(join(attacker, 'operator-entry.js'), 'throw new Error("attacker-controlled")\n')
  await symlink(realScript, join(attacker, 'start-operator.sh'))
  await writeFile(
    join(bin, 'node'),
    `#!/bin/sh\nif [ "$1" = '-e' ]; then exec '${toPath(process.execPath)}' "$@"; fi\nprintf 'cwd=%s\\narg=%s\\n' "$PWD" "$1" > '${toPath(marker)}'\n/usr/bin/env >> '${toPath(marker)}'\n`,
  )
  await chmod(join(bin, 'node'), 0o755)

  await runScript(join(attacker, 'start-operator.sh'), {
    HOME: toPath(root),
    PATH: `${toPath(bin)}:/usr/bin:/bin`,
    SHELL: '/bin/bash',
    TMPDIR: toPath(root),
  })
  // The launcher reports paths in the shell's dialect, so compare in it too.
  const launch = await readFile(marker, 'utf8')
  const escape = (value) => toPath(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  assert.match(launch, new RegExp(`cwd=${escape(expectedDir)}`))
  assert.match(launch, new RegExp(`arg=${escape(join(expectedDir, 'operator-entry.js'))}`))
})

test('operator environment reads the gateway key inside Node without logging file contents', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-operator-key-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const envPath = join(root, '.env')
  await writeFile(envPath, '# comment\nAPI_SERVER_KEY=inside-node-only\nUNRELATED=value\n', { mode: 0o600 })
  const modulePath = join(ROOT, 'apps', 'workspace', 'scripts', 'operator-environment.mjs')
  const { captureGatewaySecretsFromEnvironment, installGatewaySecrets, readGatewayKey } = await import(pathToFileURL(modulePath).href)
  assert.equal(readGatewayKey(envPath), 'inside-node-only')
  await writeFile(envPath, 'APISERVERKEY=must-never-appear-in-error\n', { mode: 0o600 })
  assert.throws(() => readGatewayKey(envPath), /API_SERVER_KEY is unavailable/)

  const childEnvironment = {
    PATH: process.env.PATH,
    HERMES_API_TOKEN: 'child-must-not-see-this',
    HERMES_DASHBOARD_TOKEN: 'child-must-not-see-this',
    CLAUDE_API_TOKEN: 'child-must-not-see-this',
    CLAUDE_DASHBOARD_TOKEN: 'child-must-not-see-this',
    SAFE_SENTINEL: 'preserved',
  }
  installGatewaySecrets({ apiToken: 'private-api', dashboardToken: 'private-dashboard' })
  captureGatewaySecretsFromEnvironment(childEnvironment)
  const { stdout } = await execFileAsync(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(process.env))'], {
    env: childEnvironment,
  })
  assert.doesNotMatch(stdout, /child-must-not-see-this|HERMES_API_TOKEN|CLAUDE_DASHBOARD_TOKEN/)
  assert.match(stdout, /SAFE_SENTINEL/)
  delete globalThis[Symbol.for('hermes.workspace.gateway-secrets')]
})

test('workspace gateway tokens live outside process.env before server modules load', async () => {
  const files = [
    'apps/workspace/operator-entry.js',
    'apps/workspace/server-entry.js',
    'apps/workspace/src/server/gateway-capabilities.ts',
    'apps/workspace/src/server/openai-compat-api.ts',
    'apps/workspace/src/routes/api/claude-proxy/$.ts',
  ]
  for (const file of files) {
    const source = await readFile(join(ROOT, file), 'utf8')
    assert.doesNotMatch(source, /process\.env\.(?:HERMES_API_TOKEN|HERMES_DASHBOARD_TOKEN|CLAUDE_API_TOKEN|CLAUDE_DASHBOARD_TOKEN)/, file)
  }
  const serverEntry = await readFile(join(ROOT, 'apps/workspace/server-entry.js'), 'utf8')
  assert.ok(
    serverEntry.indexOf('captureGatewaySecretsFromEnvironment') < serverEntry.indexOf("await import('./dist/server/server.js')"),
    'gateway tokens must be captured and deleted before the bundled server loads',
  )
})

test('workspace installer resolves its own symlink before invoking the pinned helper', { skip: NO_SHELL || WRONG_NODE }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'nexus-workspace-install-symlink-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const attacker = join(root, 'attacker')
  const bin = join(root, 'bin')
  const marker = join(root, 'attacker-helper')
  const realScript = join(ROOT, 'apps', 'workspace', 'install.sh')
  await mkdir(join(attacker, 'scripts'), { recursive: true })
  await mkdir(bin)
  await symlink(realScript, join(attacker, 'install.sh'))
  await writeFile(join(attacker, 'scripts', 'install-pinned-hermes.sh'), `#!/bin/sh\nprintf ran > '${toPath(marker)}'\nexit 42\n`)
  await chmod(join(attacker, 'scripts', 'install-pinned-hermes.sh'), 0o755)

  // install.sh's preflight runs before the symlink resolution this case exists
  // to prove, and it gates on whatever node/git/pnpm the PATH resolves first.
  // Inheriting the ambient PATH made the gate depend on the machine's package
  // manager and on registry reachability: on a host whose pnpm is not exactly
  // 9.15.0 the preflight falls into `corepack prepare`, then
  // `npm install -g pnpm@9.15.0`, and spends over a minute failing to reach the
  // registry without ever reaching the assertion below. Satisfy every preflight
  // from a fixture bin instead, so the gate is hermetic and offline.
  const bootstrap = { corepack: join(root, 'corepack-ran'), npm: join(root, 'npm-ran'), curl: join(root, 'curl-ran') }
  await writeFile(join(bin, 'node'), `#!/bin/sh\nexec '${toPath(process.execPath)}' "$@"\n`)
  await writeFile(join(bin, 'pnpm'), '#!/bin/sh\n[ "$1" = --version ] && { echo 9.15.0; exit 0; }\nexit 1\n')
  await writeFile(join(bin, 'git'), '#!/bin/sh\n[ "$1" = --version ] && { echo "git version 2.99.0"; exit 0; }\nexit 1\n')
  // Not stubs but tripwires: the preflight reaches for these three only when it
  // is about to bootstrap or download, so a recorded invocation is the
  // hermeticity failure itself, asserted below.
  for (const [name, path] of Object.entries(bootstrap)) {
    await writeFile(join(bin, name), `#!/bin/sh\nprintf '%s ' "$@" >> '${toPath(path)}'\nexit 1\n`)
  }
  for (const name of ['node', 'pnpm', 'git', ...Object.keys(bootstrap)]) {
    await chmod(join(bin, name), 0o755)
  }

  const failure = await runScript(join(attacker, 'install.sh'), {
    PATH: `${toPath(bin)}:/usr/bin:/bin`,
    HOME: toPath(root),
    TMPDIR: toPath(root),
    USER: 'tester',
    SHELL: '/bin/bash',
    TERM: 'dumb',
    INSTALL_DIR: toPath(join(root, 'workspace')),
    NEXUS_HERMES_INSTALLER_TEST_TAMPER: '1',
  }).then(() => null, (error) => error)

  // Read the markers before the message. Both of the ways this gate can be
  // lost — a preflight that bootstraps, or a symlink that redirects the helper
  // — stop short of the pinned payload and would otherwise surface only as an
  // unrelated mismatch on the final assertion.
  for (const [name, path] of Object.entries(bootstrap)) {
    await assert.rejects(readFile(path), { code: 'ENOENT' }, `${name} ran: the installer bootstrapped instead of reaching the pinned helper`)
  }
  await assert.rejects(readFile(marker), { code: 'ENOENT' }, 'the attacker-controlled helper ran: install.sh trusted its symlink directory')
  assert.ok(failure, 'the installer must fail closed on a tampered pinned payload')
  assert.match(String(failure), /integrity check failed/i)
})

test('pinned Hermes installer rejects a dirty existing checkout before download', {
  skip: NO_GIT_SHELL,
}, async (t) => {
  // GIT_SHELL, not the default one: this is the only case that reaches the
  // pinned /usr/bin/git, so it runs wherever that resolves and speaks that
  // shell's path dialect throughout.
  const p = GIT_SHELL.toPath
  const root = await mkdtemp(join(tmpdir(), 'nexus-hermes-dirty-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const checkout = join(root, '.hermes', 'hermes-agent')
  const curlMarker = join(root, 'downloaded')
  await mkdir(bin)
  await mkdir(checkout, { recursive: true })
  await execFileAsync('git', ['init', '--quiet'], { cwd: checkout })
  await writeFile(join(checkout, 'unexpected.py'), 'print("modified")\n')
  await writeFile(join(bin, 'curl'), `#!/bin/sh\nprintf downloaded > '${p(curlMarker)}'\nexit 1\n`)
  await chmod(join(bin, 'curl'), 0o755)

  const script = join(ROOT, 'apps', 'workspace', 'scripts', 'install-pinned-hermes.sh')
  await assert.rejects(
    runIn(GIT_SHELL, script, {
      HOME: p(root),
      PATH: `${p(bin)}:/usr/bin:/bin`,
      TMPDIR: p(root),
      USER: 'tester',
      SHELL: '/bin/bash',
      TERM: 'dumb',
    }),
    /dirty existing checkout/i,
  )
  await assert.rejects(readFile(curlMarker), { code: 'ENOENT' })
})

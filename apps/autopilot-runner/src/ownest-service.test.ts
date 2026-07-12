import { spawn, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..')
const WRAPPER = join(PACKAGE_ROOT, 'scripts', 'ownest-launchd.sh')
const INSTALLER = join(PACKAGE_ROOT, 'scripts', 'install-ownest-service.sh')
const PROFILE_SANITIZER = join(PACKAGE_ROOT, 'scripts', 'sanitize-ownest-profile-env.sh')
const temporaryRoots: string[] = []

function findNode22(): string | null {
  const candidates = [
    process.execPath,
    join(process.env.HOME ?? '', '.nvm', 'versions', 'node', 'v22.22.3', 'bin', 'node'),
  ]
  for (const candidate of candidates) {
    if (!candidate || !existsSync(candidate)) continue
    const result = spawnSync(candidate, ['-p', 'process.versions.node.split(".")[0]'], {
      encoding: 'utf8',
    })
    if (result.status === 0 && result.stdout.trim() === '22') return candidate
  }
  return null
}

const NODE_22 = findNode22()

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'ownest-service-'))
  temporaryRoots.push(root)
  return root
}

function fakeNode(root: string, markerFile: string, sleepSeconds = 0): string {
  const executable = join(root, 'node')
  writeFileSync(executable, [
    '#!/bin/bash',
    `printf '%s' ran > '${markerFile}'`,
    ...(sleepSeconds > 0 ? [`sleep ${sleepSeconds}`] : []),
    'printf "%s|%s|%s|%s|%s|%s" "$CC_OWNEST_LIVE" "${1:-}" "${SUPABASE_SERVICE_ROLE_KEY-unset}" "${ANTHROPIC_API_KEY-unset}" "${STRIPE_SECRET_KEY-unset}" "$HERMES_CWD"',
    '',
  ].join('\n'))
  chmodSync(executable, 0o700)
  return executable
}

async function waitForFile(path: string): Promise<void> {
  const deadline = Date.now() + 2_000
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

function wrapperEnv(root: string, node: string): NodeJS.ProcessEnv {
  return {
    HOME: root,
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    TMPDIR: tmpdir(),
    OWNEST_NODE_BIN: node,
    OWNEST_ENV_FILE: join(root, '.env.local'),
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    STRIPE_SECRET_KEY: 'test-stripe-key',
    CC_OWNEST_LIVE: '1',
    CC_OWNEST_FORCE_LIVE_OFF: '1',
  }
}

describe.skipIf(process.platform !== 'darwin')('OWNEST launchd harness', () => {
  it('pins the child command and makes the installer live-off guard non-overridable', () => {
    const root = temporaryRoot()
    const markerFile = join(root, 'ran.txt')
    const node = fakeNode(root, markerFile)
    writeFileSync(join(root, '.env.local'), [
      'CC_OWNEST_FORCE_LIVE_OFF=0',
      'CC_OWNEST_LIVE=1',
      'SUPABASE_SERVICE_ROLE_KEY=source-service-role',
      'ANTHROPIC_API_KEY=source-anthropic-key',
      'STRIPE_SECRET_KEY=source-stripe-key',
      '',
    ].join('\n'))

    const result = spawnSync('/bin/bash', [WRAPPER], {
      cwd: REPO_ROOT,
      env: wrapperEnv(root, node),
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toBe(
      `0|dist/ownest-tick.js|source-service-role|unset|unset|${REPO_ROOT}`,
    )
    expect(readFileSync(markerFile, 'utf8')).toBe('ran')
  })

  it('refuses a symlinked lock directory before invoking the child', () => {
    const root = temporaryRoot()
    const markerFile = join(root, 'ran.txt')
    const node = fakeNode(root, markerFile)
    const caches = join(root, 'Library', 'Caches')
    const target = join(root, 'redirected-lock')
    mkdirSync(caches, { recursive: true })
    mkdirSync(target)
    symlinkSync(target, join(caches, 'unite-ownest'))

    const result = spawnSync('/bin/bash', [WRAPPER], {
      cwd: REPO_ROOT,
      env: wrapperEnv(root, node),
      encoding: 'utf8',
    })

    expect(result.status).toBe(78)
    expect(result.stderr).toMatch(/symlinked OWNEST lock directory/i)
    expect(existsSync(markerFile)).toBe(false)
  })

  it('returns one healthy overlap receipt instead of starting a second tick', async () => {
    const root = temporaryRoot()
    const markerFile = join(root, 'ran.txt')
    const node = fakeNode(root, markerFile, 1)
    const env = wrapperEnv(root, node)
    const first = spawn('/bin/bash', [WRAPPER], {
      cwd: REPO_ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForFile(markerFile)

    const second = spawnSync('/bin/bash', [WRAPPER], {
      cwd: REPO_ROOT,
      env,
      encoding: 'utf8',
    })

    expect(second.status).toBe(0)
    expect(second.stderr).toBe('')
    expect(second.stdout).toBe(
      '{"schema":"ownest.tick.summary.v1","outcome":"overlap_skipped"}\n',
    )
    await expect(new Promise<number | null>((resolve) => first.once('exit', resolve))).resolves.toBe(0)
  })

  it('refuses an actual install outside the dedicated runtime checkout before building', () => {
    const root = temporaryRoot()
    const result = spawnSync('/bin/bash', [INSTALLER], {
      cwd: REPO_ROOT,
      env: {
        HOME: root,
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        TMPDIR: tmpdir(),
      },
      encoding: 'utf8',
    })

    expect(result.status).toBe(78)
    expect(result.stderr).toContain(`expected ${join(root, 'Unite-Group-OWNEST')}`)
    expect(existsSync(join(root, 'Library', 'LaunchAgents'))).toBe(false)
  })

  it.skipIf(NODE_22 === null)('dry-run builds with Node 22 and renders policy without installing', () => {
    const root = temporaryRoot()
    const result = spawnSync('/bin/bash', [INSTALLER, '--dry-run'], {
      cwd: REPO_ROOT,
      env: {
        HOME: root,
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        TMPDIR: tmpdir(),
        OWNEST_NODE_BIN: NODE_22 as string,
      },
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('<key>StartInterval</key><integer>60</integer>')
    expect(result.stdout).toContain('<key>CC_OWNEST_FORCE_LIVE_OFF</key><string>1</string>')
    expect(result.stdout).not.toContain('<key>KeepAlive</key>')
    expect(result.stdout).not.toMatch(/SUPABASE|ANTHROPIC|OPENAI|STRIPE|GMAIL/)
    expect(existsSync(join(root, 'Library', 'LaunchAgents'))).toBe(false)
  })
})

describe('OWNEST installer policy source', () => {
  it('retains commit, repository, runtime, rollback, and uninstall attestations', () => {
    const installer = readFileSync(INSTALLER, 'utf8')

    for (const required of [
      'remote get-url origin',
      'fetch --quiet --prune origin',
      'rev-parse HEAD',
      'for-each-ref --contains',
      'status --porcelain',
      '--verified-commit',
      'OWNEST requires a Node 22 runtime',
      "stat -f '%Lp'",
      "stat -f '%u'",
      'previous_plist',
      'failed.plist',
      '--uninstall',
      'service_is_loaded',
    ]) {
      expect(installer).toContain(required)
    }
    expect(installer).toMatch(/if ! \/bin\/launchctl bootstrap/)
  })
})

describe('OWNEST Hermes profile environment boundary', () => {
  function sanitizerFixture(contents: string): {
    root: string
    profile: string
    backupRoot: string
    env: NodeJS.ProcessEnv
  } {
    const root = temporaryRoot()
    const profile = join(root, 'profiles', 'ownest', '.env')
    const backupRoot = join(root, 'backups')
    mkdirSync(dirname(profile), { recursive: true })
    writeFileSync(profile, contents)
    chmodSync(profile, 0o600)
    return {
      root,
      profile,
      backupRoot,
      env: {
        HOME: root,
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        TMPDIR: tmpdir(),
        OWNEST_SANITIZER_TEST_MODE: '1',
        OWNEST_SANITIZER_TEST_PROFILE_ENV: profile,
        OWNEST_SANITIZER_TEST_BACKUP_ROOT: backupRoot,
      },
    }
  }

  it('atomically keeps only the OWNEST runtime allowlist and backs up the original', () => {
    const fixture = sanitizerFixture([
      'OPENROUTER_API_KEY=test-openrouter-value',
      'BROWSER_USE_API_KEY=test-browser-value',
      'TAO_BROWSER_DISABLED=false',
      'ANTHROPIC_API_KEY=test-anthropic-value',
      'SUPABASE_SERVICE_ROLE_KEY=test-service-role-value',
      'STRIPE_SECRET_KEY=test-stripe-value',
      'PATH=/unsafe/path',
      '',
    ].join('\n'))

    const result = spawnSync('/bin/bash', [PROFILE_SANITIZER], {
      env: fixture.env,
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toMatch(/kept=3 removed=4/)
    expect(result.stdout).not.toMatch(/test-openrouter-value|test-browser-value|test-anthropic-value|test-service-role-value|test-stripe-value/)
    const sanitised = readFileSync(fixture.profile, 'utf8')
    expect(sanitised).toContain('OPENROUTER_API_KEY=test-openrouter-value')
    expect(sanitised).toContain('BROWSER_USE_API_KEY=test-browser-value')
    expect(sanitised).toContain('TAO_BROWSER_DISABLED=false')
    expect(sanitised).not.toMatch(/ANTHROPIC|SUPABASE|STRIPE|^PATH=/m)
    expect(statSync(fixture.profile).mode & 0o777).toBe(0o600)
    const backupFile = result.stdout.match(/^Backup: (.+)$/m)?.[1]
    expect(backupFile).toBeTruthy()
    expect(readFileSync(backupFile as string, 'utf8')).toContain('ANTHROPIC_API_KEY=test-anthropic-value')
    expect(statSync(backupFile as string).mode & 0o777).toBe(0o600)
  })

  it('fails closed without changing the profile when the route key is missing or duplicated', () => {
    for (const contents of [
      'ANTHROPIC_API_KEY=test-anthropic-value\n',
      'OPENROUTER_API_KEY=first\nOPENROUTER_API_KEY=second\n',
    ]) {
      const fixture = sanitizerFixture(contents)
      const result = spawnSync('/bin/bash', [PROFILE_SANITIZER], {
        env: fixture.env,
        encoding: 'utf8',
      })

      expect(result.status).toBe(78)
      expect(readFileSync(fixture.profile, 'utf8')).toBe(contents)
      expect(existsSync(fixture.backupRoot)).toBe(false)
    }
  })

  it('rejects test path overrides unless the explicit test mode is active', () => {
    const fixture = sanitizerFixture('OPENROUTER_API_KEY=test-openrouter-value\n')
    const { OWNEST_SANITIZER_TEST_MODE: _ignored, ...env } = fixture.env
    const result = spawnSync('/bin/bash', [PROFILE_SANITIZER], { env, encoding: 'utf8' })

    expect(result.status).toBe(64)
    expect(result.stderr).toMatch(/test path overrides require/i)
    expect(readFileSync(fixture.profile, 'utf8')).toContain('test-openrouter-value')
  })

  it('refuses a symlinked profile without creating a backup', () => {
    const fixture = sanitizerFixture('OPENROUTER_API_KEY=test-openrouter-value\n')
    const realProfile = `${fixture.profile}.real`
    writeFileSync(realProfile, readFileSync(fixture.profile))
    chmodSync(realProfile, 0o600)
    rmSync(fixture.profile)
    symlinkSync(realProfile, fixture.profile)

    const result = spawnSync('/bin/bash', [PROFILE_SANITIZER], {
      env: fixture.env,
      encoding: 'utf8',
    })

    expect(result.status).toBe(78)
    expect(result.stderr).toMatch(/non-symlinked/i)
    expect(existsSync(fixture.backupRoot)).toBe(false)
  })
})

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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
const HEARTBEAT_WRAPPER = join(PACKAGE_ROOT, 'scripts', 'heartbeat-launchd.sh')
const HEARTBEAT_INSTALLER = join(PACKAGE_ROOT, 'scripts', 'install-heartbeat-service.sh')
const START_PRESENCE = join(PACKAGE_ROOT, 'start-presence.sh')
const temporaryRoots: string[] = []

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

describe('retired user-level service harnesses', () => {
  it('refuses every service start before reading configuration or invoking a child', () => {
    const root = temporaryRoot()
    const marker = join(root, 'must-not-run')

    const result = spawnSync('/bin/bash', [WRAPPER], {
      cwd: REPO_ROOT,
      env: {
        HOME: root,
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        SUPABASE_SERVICE_ROLE_KEY: 'sentinel-service-role',
        OWNEST_NODE_BIN: marker,
      },
      encoding: 'utf8',
    })

    expect(result.status).toBe(78)
    expect(result.stderr).toMatch(/dedicated-UID isolation/i)
    expect(result.stderr).not.toContain('sentinel-service-role')
    expect(existsSync(marker)).toBe(false)
  })

  it.each([HEARTBEAT_WRAPPER, START_PRESENCE])(
    'refuses the former service-role presence entrypoint %s without reading credentials',
    (entrypoint) => {
      const root = temporaryRoot()
      const secret = 'presence-service-role-must-not-leak'
      const result = spawnSync('/bin/bash', [entrypoint], {
        cwd: REPO_ROOT,
        env: {
          HOME: root,
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          SUPABASE_SERVICE_ROLE_KEY: secret,
        },
        encoding: 'utf8',
      })

      expect(result.status).toBe(78)
      expect(result.stderr).toMatch(/retired|unavailable/i)
      expect(result.stderr).not.toContain(secret)
    },
  )

  it.each([
    { args: [] },
    { args: ['--dry-run'] },
    { args: ['--verified-commit', 'a'.repeat(40)] },
  ])(
    'refuses install mode $args without creating launchd state',
    ({ args }) => {
      const root = temporaryRoot()
      const result = spawnSync('/bin/bash', [INSTALLER, ...args], {
        cwd: REPO_ROOT,
        env: {
          HOME: root,
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          TMPDIR: tmpdir(),
        },
        encoding: 'utf8',
      })

      expect(result.status).toBe(78)
      expect(result.stderr).toMatch(/installation is unavailable/i)
      expect(existsSync(join(root, 'Library', 'LaunchAgents'))).toBe(false)
    },
  )

  it.each([[], ['--dry-run'], ['--verified-commit', 'a'.repeat(40)]].map((args) => ({ args })))(
    'refuses heartbeat install mode $args without creating launchd state',
    ({ args }) => {
      const root = temporaryRoot()
      const result = spawnSync('/bin/bash', [HEARTBEAT_INSTALLER, ...args], {
        cwd: REPO_ROOT,
        env: {
          HOME: root,
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          TMPDIR: tmpdir(),
        },
        encoding: 'utf8',
      })

      expect(result.status).toBe(78)
      expect(result.stderr).toMatch(/installation is unavailable/i)
      expect(existsSync(join(root, 'Library', 'LaunchAgents'))).toBe(false)
    },
  )
})

describe('OWNEST installer policy source', () => {
  it('retains uninstall/rollback only and contains no executable install path', () => {
    const installer = readFileSync(INSTALLER, 'utf8')
    expect(installer).toContain('--uninstall')
    expect(installer).toContain('launchctl bootout')
    expect(installer).toContain('LaunchAgents.disabled-')
    expect(installer).not.toMatch(/bootstrap|StartInterval|npm run build|\.env\.local/)
  })
})

describe('retired OWNEST profile sanitizer', () => {
  it('reads no profile and creates no plaintext rollback copy', () => {
    const root = temporaryRoot()
    const profile = join(root, 'profile.env')
    const backupRoot = join(root, 'change-backups')
    const contents = 'SUPABASE_SERVICE_ROLE_KEY=must-not-be-copied\n'
    writeFileSync(profile, contents)

    const result = spawnSync('/bin/bash', [PROFILE_SANITIZER], {
      env: {
        HOME: root,
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        OWNEST_SANITIZER_TEST_MODE: '1',
        OWNEST_SANITIZER_TEST_PROFILE_ENV: profile,
        OWNEST_SANITIZER_TEST_BACKUP_ROOT: backupRoot,
      },
      encoding: 'utf8',
    })

    expect(result.status).toBe(78)
    expect(result.stderr).toMatch(/retired/i)
    expect(result.stderr).not.toContain('must-not-be-copied')
    expect(readFileSync(profile, 'utf8')).toBe(contents)
    expect(existsSync(backupRoot)).toBe(false)
  })

  it('contains no former profile-copy or allowlist implementation', () => {
    const sanitizer = readFileSync(PROFILE_SANITIZER, 'utf8')
    expect(sanitizer).not.toMatch(/change-backups|profile\.env|OPENROUTER_API_KEY|\bcp\b|\bmv\b/)
  })
})

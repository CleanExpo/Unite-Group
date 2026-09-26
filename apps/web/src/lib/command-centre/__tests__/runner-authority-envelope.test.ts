import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findPosixBash, toPosixPath } from '@/test/posix-shell'
import { DELIVERY_SCOPE } from '@/lib/command-centre/delivery-types'

// A seeded, already-approved mission runs its commands through the runner's
// committed bin/ shims. Every BUILD step in mission-authority.json must reach the
// real tool; every PROTECTED action must be refused with exit 3 before it does.

const BASH = findPosixBash()

function resolveRunnerDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    const candidate = path.join(dir, 'scripts', 'nexus-runner')
    if (existsSync(path.join(candidate, 'mission-authority.json'))) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('could not locate scripts/nexus-runner/mission-authority.json from test')
}

const RUNNER_DIR = resolveRunnerDir()
const AUTHORITY = JSON.parse(readFileSync(path.join(RUNNER_DIR, 'mission-authority.json'), 'utf8')) as {
  scope: string
  build: Record<string, string>
  protected: Record<string, string>
}

type Cmd = [tool: 'git' | 'gh' | 'vercel' | 'supabase', ...args: string[]]

// Build steps with a shell command. The rest are not tool-gated (see below).
const BUILD_COMMANDS: Record<string, Cmd[]> = {
  discover: [['git', 'log', '--oneline', '-5'], ['gh', 'pr', 'view', '12'], ['gh', 'api', 'repos/CleanExpo/Unite-Group/pulls/12']],
  commit: [['git', 'commit', '-m', 'feat: x (UNI-1)']],
  push_scoped_branch: [['git', 'push', '-u', 'origin', 'feature-x']],
  draft_pr: [['gh', 'pr', 'create', '--draft', '--title', 't', '--body', 'b'], ['gh', 'pr', 'create', '-d', '--fill']],
  preview_within_existing_mandate: [['vercel', 'deploy'], ['vercel', 'deploy', '--target', 'preview'], ['vercel', 'inspect', 'url']],
}
const BUILD_NOT_TOOL_GATED = ['edit', 'test', 'repair', 'update_linear']

const PROTECTED_COMMANDS: Record<string, Cmd[]> = {
  merge: [
    ['gh', 'pr', 'merge', '12', '--squash'],
    ['gh', 'pr', 'merge', '12', '--auto'],
    ['gh', 'api', '-X', 'PUT', 'repos/CleanExpo/Unite-Group/pulls/12/merge'],
    ['git', 'merge', 'origin/main'],
  ],
  mark_pr_ready: [['gh', 'pr', 'ready', '12'], ['gh', 'pr', 'create', '--title', 't', '--body', 'b'], ['gh', 'pr', 'create', '--draft=false', '--fill']],
  production_deploy: [
    ['vercel', '--prod'],
    ['vercel', 'deploy', '--prod'],
    ['vercel', 'deploy', '--target=production'],
    ['vercel', 'deploy', '--target', 'production'],
    ['vercel', 'promote', 'url'],
    ['vercel', 'rollback'],
    ['vercel', 'redeploy', 'url'],
    ['git', 'push', 'origin', 'HEAD:main'],
  ],
  public_publish: [['gh', 'release', 'create', 'v1.0.0']],
  spend_expansion: [['vercel', 'domains', 'buy', 'example.com']],
  destructive_action: [
    ['git', 'push', '--force', 'origin', 'feature-x'],
    ['git', 'push', 'origin', '--delete', 'feature-x'],
    ['git', 'push', 'origin', ':feature-x'],
    ['git', 'push', '--mirror', 'origin'],
    ['git', 'reset', '--hard', 'HEAD'],
    ['git', 'branch', '-D', 'feature-x'],
    ['supabase', 'db', 'push'],
    ['supabase', 'db', 'reset', '--linked'],
    ['supabase', 'migration', 'up'],
    ['gh', 'repo', 'delete', 'CleanExpo/Unite-Group'],
  ],
  credential_change: [
    ['gh', 'secret', 'set', 'X'],
    ['vercel', 'env', 'add', 'X'],
    ['vercel', 'pull'],
    ['supabase', 'secrets', 'set', 'X=1'],
  ],
  authority_change: [
    ['gh', 'api', '--method', 'PATCH', 'repos/CleanExpo/Unite-Group'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/branches/main/protection', '-f', 'enforce_admins=false'],
    ['gh', 'repo', 'edit', '--visibility', 'public'],
    ['gh', 'workflow', 'run', 'ci.yml'],
    ['gh', 'auth', 'refresh', '-s', 'admin:org'],
  ],
}
const PROTECTED_NOT_TOOL_GATED = ['strategic_scope_change']

let stubDir: string
let stub: string

beforeAll(() => {
  stubDir = mkdtempSync(path.join(tmpdir(), 'runner-authority-'))
  stub = path.join(stubDir, 'stub.sh')
  writeFileSync(
    stub,
    ['#!/bin/sh', 'if [ "$1" = "rev-parse" ]; then echo feature-x; exit 0; fi', 'echo "STUB_CALLED: $*"', 'exit 0', ''].join('\n'),
  )
  chmodSync(stub, 0o755)
})

afterAll(() => {
  rmSync(stubDir, { recursive: true, force: true })
})

function run([tool, ...args]: Cmd) {
  const shim = path.join(RUNNER_DIR, 'bin', tool)
  const real = toPosixPath(stub)
  const options = {
    encoding: 'utf8' as const,
    env: {
      ...process.env,
      NEXUS_RUNNER_REAL_GIT: real,
      NEXUS_RUNNER_REAL_GH: real,
      NEXUS_RUNNER_REAL_VERCEL: real,
      NEXUS_RUNNER_REAL_SUPABASE: real,
    },
  }
  return process.platform === 'win32'
    ? spawnSync(BASH as string, [toPosixPath(shim), ...args], options)
    : spawnSync(shim, args, options)
}

describe('mission-authority.json', () => {
  it('is bound to the approved delivery scope', () => {
    expect(AUTHORITY.scope).toBe(DELIVERY_SCOPE)
  })

  it('gives every build step and every protected action a decided test mapping', () => {
    expect([...Object.keys(BUILD_COMMANDS), ...BUILD_NOT_TOOL_GATED].sort()).toEqual(Object.keys(AUTHORITY.build).sort())
    expect([...Object.keys(PROTECTED_COMMANDS), ...PROTECTED_NOT_TOOL_GATED].sort()).toEqual(
      Object.keys(AUTHORITY.protected).sort(),
    )
  })
})

describe.skipIf(!BASH)('seeded accepted mission — runner shims', () => {
  for (const [step, cmds] of Object.entries(BUILD_COMMANDS)) {
    for (const cmd of cmds) {
      it(`BUILD ${step}: '${cmd.join(' ')}' proceeds with no stop`, () => {
        const r = run(cmd)
        expect(r.status).toBe(0)
        expect(r.stdout).toContain(`STUB_CALLED: ${cmd.slice(1).join(' ')}`)
      })
    }
  }

  for (const [action, cmds] of Object.entries(PROTECTED_COMMANDS)) {
    for (const cmd of cmds) {
      it(`PROTECTED ${action}: '${cmd.join(' ')}' stops at the boundary`, () => {
        const r = run(cmd)
        expect(r.status).toBe(3)
        expect(r.stderr).toContain('nexus-runner: BLOCKED')
        expect(r.stdout).not.toContain('STUB_CALLED')
      })
    }
  }
})

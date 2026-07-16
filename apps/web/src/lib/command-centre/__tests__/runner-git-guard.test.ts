import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Resolve the committed runner git shim by walking up from this test file to
// the repo root (the file that must exist: scripts/nexus-runner/bin/git).
function resolveShim(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    const candidate = path.join(dir, 'scripts', 'nexus-runner', 'bin', 'git')
    if (existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('could not locate scripts/nexus-runner/bin/git from test')
}

const SHIM = resolveShim()

// A hermetic stub standing in for the real git: it echoes its args (so we can
// assert it was reached) and answers `rev-parse --abbrev-ref HEAD` with the
// branch supplied via STUB_BRANCH — no real repo or network required.
let stubDir: string
let stubGit: string

beforeAll(() => {
  stubDir = mkdtempSync(path.join(tmpdir(), 'runner-git-guard-'))
  stubGit = path.join(stubDir, 'stub-git.sh')
  writeFileSync(
    stubGit,
    [
      '#!/bin/sh',
      'if [ "$1" = "rev-parse" ]; then echo "${STUB_BRANCH:-feature-x}"; exit 0; fi',
      'echo "STUB_CALLED: $*"',
      'exit 0',
      '',
    ].join('\n'),
  )
  chmodSync(stubGit, 0o755)
})

afterAll(() => {
  rmSync(stubDir, { recursive: true, force: true })
})

function runShim(args: string[], branch = 'feature-x') {
  return spawnSync(SHIM, args, {
    encoding: 'utf8',
    env: { ...process.env, NEXUS_RUNNER_REAL_GIT: stubGit, STUB_BRANCH: branch },
  })
}

describe('nexus-runner git shim', () => {
  it('blocks force push (--force) with exit 3', () => {
    const r = runShim(['push', '--force', 'origin', 'feature-x'])
    expect(r.status).toBe(3)
    expect(r.stderr).toContain('nexus-runner: BLOCKED')
    expect(r.stdout).not.toContain('STUB_CALLED')
  })

  it('blocks force push (-f) with exit 3', () => {
    expect(runShim(['push', '-f', 'origin', 'feature-x']).status).toBe(3)
  })

  it('blocks force-with-lease push with exit 3', () => {
    expect(runShim(['push', '--force-with-lease', 'origin', 'feature-x']).status).toBe(3)
    expect(runShim(['push', '--force-with-lease=origin/feature-x', 'origin', 'feature-x']).status).toBe(3)
  })

  it('blocks merge with exit 3', () => {
    const r = runShim(['merge', 'origin/main'])
    expect(r.status).toBe(3)
    expect(r.stdout).not.toContain('STUB_CALLED')
  })

  it('blocks reset --hard with exit 3', () => {
    expect(runShim(['reset', '--hard', 'HEAD']).status).toBe(3)
  })

  it('blocks branch -D with exit 3', () => {
    expect(runShim(['branch', '-D', 'feature-x']).status).toBe(3)
    expect(runShim(['branch', '--delete', 'feature-x']).status).toBe(3)
  })

  it('blocks push while on the default branch with exit 3', () => {
    // No explicit main refspec — the block comes from rev-parse reporting main.
    const r = runShim(['push', '-u', 'origin', 'feature-x'], 'main')
    expect(r.status).toBe(3)
    expect(r.stdout).not.toContain('STUB_CALLED')
  })

  it('blocks push to an explicit main/master refspec with exit 3', () => {
    expect(runShim(['push', 'origin', 'HEAD:main'], 'feature-x').status).toBe(3)
    expect(runShim(['push', 'origin', 'main'], 'feature-x').status).toBe(3)
    expect(runShim(['push', 'origin', 'master'], 'feature-x').status).toBe(3)
  })

  it('allows a plain feature-branch push to real git (exit 0, git reached)', () => {
    const r = runShim(['push', '-u', 'origin', 'feature-x'], 'feature-x')
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('STUB_CALLED: push -u origin feature-x')
  })

  it('allows a non-push command through to real git (exit 0)', () => {
    const r = runShim(['status'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('STUB_CALLED: status')
  })
})

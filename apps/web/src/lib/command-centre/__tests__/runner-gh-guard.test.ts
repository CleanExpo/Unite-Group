import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findPosixBash, toPosixPath } from '@/test/posix-shell'

const BASH = findPosixBash()

function resolveShim(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    const candidate = path.join(dir, 'scripts', 'nexus-runner', 'bin', 'gh')
    if (existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('could not locate scripts/nexus-runner/bin/gh from test')
}

const SHIM = resolveShim()
let stubDir: string
let stubGh: string

beforeAll(() => {
  stubDir = mkdtempSync(path.join(tmpdir(), 'runner-gh-guard-'))
  stubGh = path.join(stubDir, 'stub-gh.sh')
  writeFileSync(stubGh, ['#!/bin/sh', 'echo "STUB_GH_CALLED: $*"', 'exit 0', ''].join('\n'))
  chmodSync(stubGh, 0o755)
})

afterAll(() => {
  rmSync(stubDir, { recursive: true, force: true })
})

function runShim(args: string[]) {
  const options = {
    encoding: 'utf8' as const,
    env: {
      ...process.env,
      NEXUS_RUNNER_REAL_GH: toPosixPath(stubGh),
    },
  }

  return process.platform === 'win32'
    ? spawnSync(BASH as string, [toPosixPath(SHIM), ...args], options)
    : spawnSync(SHIM, args, options)
}

function expectBlocked(args: string[]) {
  const result = runShim(args)
  expect(result.status).toBe(3)
  expect(result.stderr).toContain('nexus-runner: BLOCKED')
  expect(result.stdout).not.toContain('STUB_GH_CALLED')
}

describe.skipIf(!BASH)('nexus-runner gh shim', () => {
  it('allows read-only PR inspection', () => {
    for (const args of [
      ['pr', 'view', '123', '--json', 'state,headRefOid'],
      ['pr', 'list', '--state', 'open'],
      ['pr', 'status'],
      ['pr', 'checks', '123'],
      ['pr', 'diff', '123'],
    ]) {
      const result = runShim(args)
      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`STUB_GH_CALLED: ${args.join(' ')}`)
    }
  })

  it('allows only a draft PR targeting main to be created', () => {
    const result = runShim([
      'pr',
      'create',
      '--draft',
      '--base',
      'main',
      '--title',
      'candidate',
      '--body',
      'bounded candidate',
    ])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('STUB_GH_CALLED: pr create --draft --base main')

    const equalsForm = runShim(['pr', 'create', '--draft', '--base=main', '--title', 'candidate'])
    expect(equalsForm.status).toBe(0)
  })

  it('blocks PR creation that is not explicitly draft', () => {
    expectBlocked(['pr', 'create', '--base', 'main', '--title', 'candidate'])
  })

  it('blocks PR creation against a non-main base', () => {
    expectBlocked(['pr', 'create', '--draft', '--base', 'feature-base', '--title', 'candidate'])
  })

  it('blocks browser-driven PR creation', () => {
    expectBlocked(['pr', 'create', '--draft', '--base', 'main', '--web'])
  })

  it('blocks ready-for-review and merge progression', () => {
    expectBlocked(['pr', 'ready', '123'])
    expectBlocked(['pr', 'merge', '123', '--squash'])
  })

  it('blocks other PR mutations', () => {
    expectBlocked(['pr', 'edit', '123', '--title', 'changed'])
    expectBlocked(['pr', 'review', '123', '--approve'])
    expectBlocked(['pr', 'comment', '123', '--body', 'comment'])
    expectBlocked(['pr', 'close', '123'])
    expectBlocked(['pr', 'reopen', '123'])
  })

  it('blocks raw API access so fields cannot silently turn reads into writes', () => {
    expectBlocked(['api', 'repos/CleanExpo/Unite-Group/pulls/123'])
    expectBlocked(['api', '--method', 'PUT', 'repos/CleanExpo/Unite-Group/pulls/123/merge'])
  })

  it('blocks release, secrets, variables and workflow dispatch', () => {
    expectBlocked(['release', 'create', 'v1.0.0'])
    expectBlocked(['secret', 'set', 'TOKEN'])
    expectBlocked(['variable', 'set', 'FLAG', '--body', 'true'])
    expectBlocked(['workflow', 'run', 'ci.yml'])
  })

  it('allows bounded read-only repository and workflow inspection', () => {
    for (const args of [
      ['repo', 'view'],
      ['auth', 'status'],
      ['issue', 'view', '123'],
      ['issue', 'list'],
      ['run', 'view', '456'],
      ['run', 'list'],
      ['workflow', 'view', 'ci.yml'],
      ['workflow', 'list'],
      ['search', 'prs', 'fix'],
    ]) {
      const result = runShim(args)
      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`STUB_GH_CALLED: ${args.join(' ')}`)
    }
  })
})

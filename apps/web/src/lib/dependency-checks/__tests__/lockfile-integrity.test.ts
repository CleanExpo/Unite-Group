import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const tempRoots: string[] = []

function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dependency-checks-'))
  tempRoots.push(root)
  mkdirSync(root, { recursive: true })
  return root
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function runLockfileIntegrity(cwd: string) {
  const scriptPath = join(process.cwd(), 'scripts', 'dependency-checks.sh')
  return spawnSync('bash', ['-lc', `source ${shellQuote(scriptPath)}; check_lockfile_integrity`], {
    cwd,
    encoding: 'utf8',
  })
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('check_lockfile_integrity', () => {
  it('does not warn solely because package.json has a newer filesystem timestamp than a valid lockfile', () => {
    const cwd = makeFixture()
    const lockfilePath = join(cwd, 'pnpm-lock.yaml')
    const packagePath = join(cwd, 'package.json')

    writeFileSync(lockfilePath, 'lockfileVersion: 9.0\nimporters:\n  .: {}\n')
    writeFileSync(packagePath, '{"name":"fixture","private":true}\n')

    const now = new Date()
    const older = new Date(now.getTime() - 60_000)
    utimesSync(lockfilePath, older, older)
    utimesSync(packagePath, now, now)

    const result = runLockfileIntegrity(cwd)

    expect(result.status).toBe(0)
    expect(result.stdout).not.toContain('WARN:OUTDATED')
    expect(result.stderr).toBe('')
  })
})

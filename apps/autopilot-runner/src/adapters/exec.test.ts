import { describe, it, expect } from 'vitest'
import { runCommand, runGit } from './exec'

const cwd = process.cwd()

describe('runCommand (real spawn)', () => {
  it('captures exit 0 and stdout', async () => {
    const r = await runCommand('node -e "console.log(42)"', cwd)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('42')
  })

  it('propagates a non-zero exit code', async () => {
    const r = await runCommand('node -e "process.exit(3)"', cwd)
    expect(r.exitCode).toBe(3)
  })

  it('chains commands via the shell', async () => {
    const r = await runCommand('node -e "process.exit(0)" && node -e "process.exit(0)"', cwd)
    expect(r.exitCode).toBe(0)
  })

  it('returns a non-zero exit for a missing binary', async () => {
    const r = await runCommand('this-binary-does-not-exist-xyz', cwd)
    expect(r.exitCode).not.toBe(0)
  })
})

describe('runGit (real spawn, no shell)', () => {
  it('runs git --version', async () => {
    const r = await runGit(['--version'], cwd)
    expect(r.exitCode).toBe(0)
    expect(r.stdout.toLowerCase()).toContain('git version')
  })

  it('returns a non-zero exit for a bad subcommand', async () => {
    const r = await runGit(['definitely-not-a-real-git-subcommand'], cwd)
    expect(r.exitCode).not.toBe(0)
  })
})

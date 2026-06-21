import { describe, it, expect, vi } from 'vitest'
import { runGauntlet, type CommandRunner, type CommandOutcome } from './gauntlet.js'

const ok: CommandOutcome = { exitCode: 0, stdout: 'ok', stderr: '' }
const fail: CommandOutcome = { exitCode: 1, stdout: '', stderr: 'boom' }

/** A runner that returns a queued outcome per call, by command. */
function scriptedRunner(byCommand: Record<string, CommandOutcome>): CommandRunner {
  return async (command) => byCommand[command] ?? ok
}

describe('runGauntlet', () => {
  const cwd = '/tmp/wt'

  it('passes when every command exits 0', async () => {
    const r = await runGauntlet({ run: scriptedRunner({}), cwd }, ['pnpm build', 'pnpm type-check', 'pnpm test'])
    expect(r.passed).toBe(true)
    expect(r.failedAt).toBeNull()
    expect(r.results).toHaveLength(3)
  })

  it('stops at the first failing command and reports it', async () => {
    const run = scriptedRunner({ 'pnpm type-check': fail })
    const r = await runGauntlet({ run, cwd }, ['pnpm build', 'pnpm type-check', 'pnpm test'])
    expect(r.passed).toBe(false)
    expect(r.failedAt).toBe('pnpm type-check')
    // build + type-check ran; test never ran.
    expect(r.results.map((x) => x.command)).toEqual(['pnpm build', 'pnpm type-check'])
  })

  it('treats a thrown runner as a failure (exit -1)', async () => {
    const run: CommandRunner = async () => {
      throw new Error('spawn ENOENT')
    }
    const r = await runGauntlet({ run, cwd }, ['pnpm build'])
    expect(r.passed).toBe(false)
    expect(r.failedAt).toBe('pnpm build')
    expect(r.results[0]).toMatchObject({ exitCode: -1, stderr: 'spawn ENOENT' })
  })

  it('fails closed on an empty command list (nothing run is not green)', async () => {
    const run = vi.fn<CommandRunner>(async () => ok)
    const r = await runGauntlet({ run, cwd }, [])
    expect(r).toEqual({ passed: false, results: [], failedAt: '(no gauntlet commands)' })
    expect(run).not.toHaveBeenCalled()
  })

  it('passes the cwd through to the runner', async () => {
    const run = vi.fn<CommandRunner>(async () => ok)
    await runGauntlet({ run, cwd }, ['pnpm test'])
    expect(run).toHaveBeenCalledWith('pnpm test', cwd)
  })

  it('does not run any command after a failure', async () => {
    const run = vi.fn<CommandRunner>(async (command) => (command === 'a' ? fail : ok))
    await runGauntlet({ run, cwd }, ['a', 'b', 'c'])
    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith('a', cwd)
  })
})

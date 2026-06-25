import { describe, expect, it } from 'vitest'
import { createCliAdapter, type SpawnFn } from './cli-adapter'
import type { Lane } from './types'

function cliLane(tool: 'claude-code' | 'codex', account = 'max-1'): Lane {
  return {
    id: 'l1',
    kind: 'cli',
    backend: { kind: 'cli', tool, account },
    role: 'builder',
    repo: '/r',
    worktree: '/w/lane',
    branch: 'lane/l1',
    status: 'idle',
  }
}

type Captured = {
  command: string
  args: Array<string>
  cwd: string
  env: NodeJS.ProcessEnv
}

describe('CliLaneAdapter', () => {
  it('spawns `claude -p <mission>` in the worktree with the account config dir', async () => {
    let cap: Captured | null = null
    const spawn: SpawnFn = async (command, args, opts) => {
      cap = { command, args, cwd: opts.cwd, env: opts.env }
      return { code: 0, stdout: 'done', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })
    const res = await adapter.run(cliLane('claude-code', 'max-2'), 'build it')
    expect(res.output).toBe('done')
    expect(cap!.command).toBe('claude')
    expect(cap!.args).toEqual(['-p', 'build it'])
    expect(cap!.cwd).toBe('/w/lane')
    expect(cap!.env.CLAUDE_CONFIG_DIR).toBe('/accts/max-2')
  })

  it('spawns `codex exec <mission>` with CODEX_HOME for the account', async () => {
    let cap: Captured | null = null
    const spawn: SpawnFn = async (command, args, opts) => {
      cap = { command, args, cwd: opts.cwd, env: opts.env }
      return { code: 0, stdout: 'ok', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })
    await adapter.run(cliLane('codex', 'openai-pro'), 'x')
    expect(cap!.command).toBe('codex')
    expect(cap!.args).toEqual(['exec', 'x'])
    expect(cap!.env.CODEX_HOME).toBe('/accts/openai-pro')
  })

  it('throws with stderr detail on a non-zero exit', async () => {
    const spawn: SpawnFn = async () => ({
      code: 1,
      stdout: '',
      stderr: 'not logged in',
    })
    const adapter = createCliAdapter({ spawn })
    await expect(adapter.run(cliLane('claude-code'), 'x')).rejects.toThrow(
      /exited 1: not logged in/,
    )
  })

  it('rejects non-cli lanes', async () => {
    const adapter = createCliAdapter({
      spawn: async () => ({ code: 0, stdout: '', stderr: '' }),
    })
    const gateway: Lane = {
      ...cliLane('claude-code'),
      kind: 'gateway',
      backend: { kind: 'gateway', provider: 'minimax', model: '' },
    }
    await expect(adapter.run(gateway, 'x')).rejects.toThrow(/only runs cli/)
  })
})

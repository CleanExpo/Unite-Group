import { describe, it, expect, vi } from 'vitest'
import { makeAuthor, defaultClaudeCommand, type AuthorDeps } from './author'
import type { LinearExecutionPacket } from '../packet'

const packet: LinearExecutionPacket = {
  source: 'command-centre:linear-claim',
  runId: 'r',
  runner: 'pi-dev-autopilot',
  issue: { id: 'a', identifier: 'UNI-9', title: 'do it', priority: 2 },
  branchName: 'pidev/auto-uni-9',
  prompt: 'implement the acceptance criteria',
  steps: [],
}

function fakeDeps(overrides: Partial<AuthorDeps> = {}): AuthorDeps {
  return {
    writePrompt: async (_wt, _p) => '/wt/.autopilot-prompt.txt',
    run: async () => ({ exitCode: 0, stdout: 'done', stderr: '' }),
    ...overrides,
  }
}

describe('makeAuthor', () => {
  it('returns ok when the worker exits 0', async () => {
    const r = await makeAuthor(fakeDeps())(packet, '/wt')
    expect(r).toEqual({ ok: true })
  })

  it('stages the prompt then runs the worker in the worktree', async () => {
    const writePrompt = vi.fn(async () => '/wt/.autopilot-prompt.txt')
    const run = vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' }))
    await makeAuthor(fakeDeps({ writePrompt, run }))(packet, '/wt')
    // composes an implement-only prompt carrying the issue ref
    expect(writePrompt).toHaveBeenCalledWith('/wt', expect.stringContaining('UNI-9'))
    expect(writePrompt).toHaveBeenCalledWith('/wt', expect.stringContaining('CODE CHANGES ONLY'))
    expect(run).toHaveBeenCalledWith(expect.stringContaining('/wt/.autopilot-prompt.txt'), '/wt')
  })

  it('uses a custom buildCommand when provided', async () => {
    const run = vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' }))
    await makeAuthor(fakeDeps({ run, buildCommand: (f) => `my-worker ${f}` }))(packet, '/wt')
    expect(run).toHaveBeenCalledWith('my-worker /wt/.autopilot-prompt.txt', '/wt')
  })

  it('fails closed when the worker exits non-zero (with stderr)', async () => {
    const r = await makeAuthor(fakeDeps({ run: async () => ({ exitCode: 2, stdout: '', stderr: 'boom' }) }))(packet, '/wt')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('claude exited 2')
    expect(r.error).toContain('boom')
  })

  it('fails closed when staging the prompt throws', async () => {
    const r = await makeAuthor(fakeDeps({ writePrompt: async () => { throw new Error('no space') } }))(packet, '/wt')
    expect(r).toMatchObject({ ok: false })
    expect(r.error).toContain('stage prompt')
  })

  it('fails closed when the spawn throws', async () => {
    const r = await makeAuthor(fakeDeps({ run: async () => { throw new Error('ENOENT') } }))(packet, '/wt')
    expect(r).toMatchObject({ ok: false })
    expect(r.error).toContain('worker spawn failed')
  })
})

describe('defaultClaudeCommand', () => {
  it('references the prompt file', () => {
    expect(defaultClaudeCommand('/wt/p.txt')).toContain('/wt/p.txt')
  })
})

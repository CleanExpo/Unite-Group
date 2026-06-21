import { describe, it, expect, vi } from 'vitest'
import {
  createWorktree,
  removeWorktree,
  worktreePathForBranch,
  DEFAULT_BASE_REF,
  type GitRunner,
  type GitOutcome,
} from './worktree.js'

const ok: GitOutcome = { exitCode: 0, stdout: '', stderr: '' }
const fail: GitOutcome = { exitCode: 1, stdout: '', stderr: 'fatal: already exists' }

describe('worktreePathForBranch', () => {
  it('flattens a slashed branch into a safe dir', () => {
    expect(worktreePathForBranch('/tmp/wt', 'pidev/auto-uni-2143')).toBe('/tmp/wt/pidev-auto-uni-2143')
  })
  it('strips a trailing slash on the base dir', () => {
    expect(worktreePathForBranch('/tmp/wt/', 'x')).toBe('/tmp/wt/x')
  })
  it('falls back to "wt" for an empty/garbage branch', () => {
    expect(worktreePathForBranch('/tmp/wt', '///')).toBe('/tmp/wt/wt')
  })
})

describe('createWorktree', () => {
  const base = { repoDir: '/repo', worktreePath: '/tmp/wt/b', branch: 'pidev/auto-uni-1' }

  it('creates the worktree and returns its path + branch', async () => {
    const git = vi.fn<GitRunner>(async () => ok)
    const r = await createWorktree({ git }, base)
    expect(r).toEqual({ ok: true, path: '/tmp/wt/b', branch: 'pidev/auto-uni-1' })
  })

  it('invokes git with the correct args and cwd (default base ref)', async () => {
    const git = vi.fn<GitRunner>(async () => ok)
    await createWorktree({ git }, base)
    expect(git).toHaveBeenCalledWith(
      ['worktree', 'add', '-B', 'pidev/auto-uni-1', '/tmp/wt/b', DEFAULT_BASE_REF],
      '/repo',
    )
  })

  it('honours a custom base ref', async () => {
    const git = vi.fn<GitRunner>(async () => ok)
    await createWorktree({ git }, { ...base, baseRef: 'origin/release' })
    expect(git).toHaveBeenCalledWith(expect.arrayContaining(['origin/release']), '/repo')
  })

  it('fails closed when git exits non-zero, surfacing stderr', async () => {
    const r = await createWorktree({ git: async () => fail }, base)
    expect(r).toEqual({ ok: false, error: 'fatal: already exists' })
  })

  it('fails closed when the runner throws', async () => {
    const r = await createWorktree({ git: async () => { throw new Error('git ENOENT') } }, base)
    expect(r).toEqual({ ok: false, error: 'git ENOENT' })
  })

  it.each([
    ['missing repoDir', { ...base, repoDir: '' }],
    ['missing worktreePath', { ...base, worktreePath: '' }],
    ['missing branch', { ...base, branch: '' }],
  ])('rejects %s without calling git', async (_label, opts) => {
    const git = vi.fn<GitRunner>(async () => ok)
    const r = await createWorktree({ git }, opts)
    expect(r.ok).toBe(false)
    expect(git).not.toHaveBeenCalled()
  })
})

describe('removeWorktree', () => {
  const base = { repoDir: '/repo', worktreePath: '/tmp/wt/b' }

  it('force-removes the worktree', async () => {
    const git = vi.fn<GitRunner>(async () => ok)
    const r = await removeWorktree({ git }, base)
    expect(r).toEqual({ ok: true })
    expect(git).toHaveBeenCalledWith(['worktree', 'remove', '/tmp/wt/b', '--force'], '/repo')
  })

  it('fails closed on a non-zero exit', async () => {
    const r = await removeWorktree({ git: async () => fail }, base)
    expect(r.ok).toBe(false)
  })

  it('fails closed when the runner throws', async () => {
    const r = await removeWorktree({ git: async () => { throw new Error('boom') } }, base)
    expect(r).toEqual({ ok: false, error: 'boom' })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { ensureClone, publishBranch, tokenRemoteUrl, type GitRunner, type GitOutcome } from './git-repo'

const OK: GitOutcome = { exitCode: 0, stdout: '', stderr: '' }
const FAIL: GitOutcome = { exitCode: 1, stdout: '', stderr: 'git error' }

/** A git fake driven by a per-(subcommand) responder. */
function gitFake(responder: (args: string[], cwd: string) => GitOutcome): { git: GitRunner; calls: string[][] } {
  const calls: string[][] = []
  const git: GitRunner = async (args, cwd) => {
    calls.push(args)
    return responder(args, cwd)
  }
  return { git, calls }
}

describe('tokenRemoteUrl', () => {
  it('embeds the token in the HTTPS remote', () => {
    expect(tokenRemoteUrl('CleanExpo/Unite-Group', 'tok')).toBe('https://x-access-token:tok@github.com/CleanExpo/Unite-Group.git')
  })
})

describe('ensureClone', () => {
  const base = { repoDir: '/work/repo', repo: 'CleanExpo/Unite-Group', token: 'tok', parentDir: '/work' }

  it('clones fresh when the dir is not a git repo', async () => {
    const f = gitFake((args) => (args[0] === 'rev-parse' ? FAIL : OK))
    const r = await ensureClone(f, base)
    expect(r).toEqual({ ok: true })
    expect(f.calls.some((a) => a[0] === 'clone')).toBe(true)
  })

  it('syncs (fetch + reset) an existing clone', async () => {
    const f = gitFake(() => OK) // rev-parse succeeds
    const r = await ensureClone(f, base)
    expect(r).toEqual({ ok: true })
    const subs = f.calls.map((a) => a[0])
    expect(subs).toEqual(expect.arrayContaining(['rev-parse', 'fetch', 'reset']))
    expect(f.calls.some((a) => a[0] === 'clone')).toBe(false)
  })

  it('fails closed when clone fails', async () => {
    const f = gitFake((args) => (args[0] === 'rev-parse' ? FAIL : FAIL))
    const r = await ensureClone(f, base)
    expect(r.ok).toBe(false)
  })

  it('fails closed when a sync step fails', async () => {
    const f = gitFake((args) => (args[0] === 'fetch' ? FAIL : OK))
    const r = await ensureClone(f, base)
    expect(r.ok).toBe(false)
  })
})

describe('publishBranch', () => {
  const base = { worktreePath: '/work/wt', branch: 'pidev/auto-uni-9', repo: 'CleanExpo/Unite-Group', token: 'tok', message: 'feat: x [UNI-9]' }

  it('commits and pushes when there are changes', async () => {
    const f = gitFake((args) => (args[0] === 'status' ? { ...OK, stdout: ' M src/a.ts\n' } : OK))
    const r = await publishBranch(f, base)
    expect(r).toEqual({ ok: true, hasChanges: true })
    expect(f.calls.some((a) => a.includes('commit'))).toBe(true)
    const push = f.calls.find((a) => a[0] === 'push')
    expect(push).toBeDefined()
    expect(push).toEqual(expect.arrayContaining([tokenRemoteUrl(base.repo, base.token), base.branch]))
  })

  it('does nothing when the worker made no changes', async () => {
    const f = gitFake((args) => (args[0] === 'status' ? { ...OK, stdout: '' } : OK))
    const r = await publishBranch(f, base)
    expect(r).toEqual({ ok: true, hasChanges: false })
    expect(f.calls.some((a) => a.includes('commit'))).toBe(false)
    expect(f.calls.some((a) => a[0] === 'push')).toBe(false)
  })

  it('fails closed when the push fails', async () => {
    const f = gitFake((args) => {
      if (args[0] === 'status') return { ...OK, stdout: ' M x\n' }
      if (args[0] === 'push') return FAIL
      return OK
    })
    const r = await publishBranch(f, base)
    expect(r.ok).toBe(false)
  })

  it('sets a bot commit identity', async () => {
    const f = gitFake((args) => (args[0] === 'status' ? { ...OK, stdout: ' M x\n' } : OK))
    await publishBranch(f, base)
    const commit = f.calls.find((a) => a.includes('commit'))
    expect(commit?.join(' ')).toContain('user.name=unite-autopilot[bot]')
  })
})

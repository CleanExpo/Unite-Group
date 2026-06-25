import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWorktreeManager } from './worktree-manager'

const run = promisify(execFile)

let repo = ''
let base = ''

beforeEach(async () => {
  repo = await fs.mkdtemp(path.join(os.tmpdir(), 'lane-repo-'))
  base = await fs.mkdtemp(path.join(os.tmpdir(), 'lane-base-'))
  await run('git', ['-C', repo, 'init', '-q'])
  await run('git', ['-C', repo, 'config', 'user.email', 'test@test.test'])
  await run('git', ['-C', repo, 'config', 'user.name', 'Test'])
  await fs.writeFile(path.join(repo, 'README.md'), '# repo\n')
  await run('git', ['-C', repo, 'add', '.'])
  await run('git', ['-C', repo, 'commit', '-q', '-m', 'init'])
})

afterEach(async () => {
  await fs.rm(repo, { recursive: true, force: true })
  await fs.rm(base, { recursive: true, force: true })
})

describe('WorktreeManager', () => {
  it('creates an isolated worktree + branch on the repo HEAD and removes it', async () => {
    const mgr = createWorktreeManager({ baseDir: base })

    const handle = await mgr.create(repo, 'lane_1')
    expect(handle.branch).toBe('lane/lane_1')

    // Worktree exists and carries the repo content.
    await expect(
      fs.access(path.join(handle.worktree, 'README.md')),
    ).resolves.toBeUndefined()

    // The branch was created in the repo.
    const { stdout } = await run('git', [
      '-C',
      repo,
      'branch',
      '--list',
      'lane/lane_1',
    ])
    expect(stdout).toContain('lane/lane_1')

    await mgr.remove(repo, handle, { force: true })
    await expect(fs.access(handle.worktree)).rejects.toThrow()
  })

  it('rejects when the target is not a git repo', async () => {
    const notRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'not-repo-'))
    const mgr = createWorktreeManager({ baseDir: base })
    await expect(mgr.create(notRepo, 'lane_2')).rejects.toThrow()
    await fs.rm(notRepo, { recursive: true, force: true })
  })
})

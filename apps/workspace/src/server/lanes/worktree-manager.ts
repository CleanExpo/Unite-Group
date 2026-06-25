/**
 * WorktreeManager — one git worktree + branch per lane, so parallel lanes never
 * collide on files. Worktrees live under a base dir (default ~/.hermes/lanes).
 * On removal the branch is kept by default (work is mergeable); an unchanged
 * worktree can be force-removed.
 */
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export interface WorktreeHandle {
  worktree: string
  branch: string
}

export interface WorktreeManager {
  create(repo: string, laneId: string): Promise<WorktreeHandle>
  remove(
    repo: string,
    handle: WorktreeHandle,
    opts?: { force?: boolean },
  ): Promise<void>
}

async function git(repo: string, args: Array<string>): Promise<string> {
  const { stdout } = await run('git', ['-C', repo, ...args])
  return stdout.trim()
}

export function createWorktreeManager(
  options: { baseDir?: string } = {},
): WorktreeManager {
  const baseDir = options.baseDir || path.join(os.homedir(), '.hermes', 'lanes')

  return {
    async create(repo, laneId) {
      // Validate repo is a git working tree before touching anything.
      await git(repo, ['rev-parse', '--is-inside-work-tree'])
      const branch = `lane/${laneId}`
      const worktree = path.join(baseDir, laneId)
      // Base the worktree on the repo's current HEAD, on a fresh branch.
      await git(repo, ['worktree', 'add', '-b', branch, worktree, 'HEAD'])
      return { worktree, branch }
    },

    async remove(repo, handle, opts = {}) {
      const args = ['worktree', 'remove', handle.worktree]
      if (opts.force) args.push('--force')
      await git(repo, args)
      // Prune any stale administrative entries.
      await git(repo, ['worktree', 'prune'])
    },
  }
}

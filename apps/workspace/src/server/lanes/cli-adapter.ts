/**
 * CliLaneAdapter — runs a lane mission by spawning a real CLI coding agent in
 * the lane's worktree: Claude Code (with the role-account's config dir) or
 * Codex. The spawn is injected so the adapter is unit-testable without the CLIs.
 *
 * Credentials boundary: this only invokes already-authed CLIs. Each account's
 * login lives in its own config dir (CLAUDE_CONFIG_DIR / CODEX_HOME); the user
 * logs each account in once. The adapter never enters credentials.
 */
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import path from 'node:path'
import type { LaneAdapter, RunResult } from './adapter'
import type { Lane } from './types'

export interface SpawnResult {
  code: number
  stdout: string
  stderr: string
}

export type SpawnFn = (
  command: string,
  args: Array<string>,
  opts: { cwd: string; env: NodeJS.ProcessEnv },
) => Promise<SpawnResult>

export interface CliAdapterDeps {
  spawn?: SpawnFn
  /** Base dir holding per-account CLI config dirs. */
  accountsDir?: string
}

/** Per-account config dir so each plan/account stays isolated and authed. */
function accountConfigDir(accountsDir: string, account: string): string {
  return path.join(accountsDir, account)
}

/** Default spawn: run the CLI, collect stdout/stderr, resolve on exit. */
function defaultSpawn(
  command: string,
  args: Array<string>,
  opts: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let child
    try {
      // stdin closed so the CLI doesn't block waiting on it (it reads the
      // mission from argv); capture stdout/stderr.
      child = spawn(command, args, {
        cwd: opts.cwd,
        env: opts.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      reject(err)
      return
    }
    child.stdout?.on('data', (d) => {
      stdout += String(d)
    })
    child.stderr?.on('data', (d) => {
      stderr += String(d)
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('CLI agent timed out after 180s'))
    }, 180_000)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 0, stdout, stderr })
    })
  })
}

export function createCliAdapter(deps: CliAdapterDeps = {}): LaneAdapter {
  const spawnFn = deps.spawn || defaultSpawn
  const accountsDir =
    deps.accountsDir || path.join(homedir(), '.hermes', 'accounts')

  return {
    async run(lane: Lane, mission: string): Promise<RunResult> {
      if (lane.backend.kind !== 'cli') {
        throw new Error('CliLaneAdapter only runs cli lanes')
      }
      const { tool, account } = lane.backend
      const configDir = accountConfigDir(accountsDir, account)

      const command = tool === 'codex' ? 'codex' : 'claude'
      const args = tool === 'codex' ? ['exec', mission] : ['-p', mission]

      // Isolate the account's auth via its own config dir, and ensure the
      // common CLI install locations are on PATH.
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: [
          path.join(homedir(), '.local', 'bin'),
          path.join(homedir(), '.claude', 'bin'),
          process.env.PATH || '',
        ]
          .filter(Boolean)
          .join(':'),
        ...(tool === 'codex'
          ? { CODEX_HOME: configDir }
          : { CLAUDE_CONFIG_DIR: configDir }),
      }

      const result = await spawnFn(command, args, { cwd: lane.worktree, env })
      if (result.code !== 0) {
        const detail = (result.stderr || result.stdout || '').slice(0, 400)
        throw new Error(`${command} exited ${result.code}: ${detail}`)
      }
      return { output: result.stdout }
    },
  }
}

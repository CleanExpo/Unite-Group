// apps/autopilot-runner/src/adapters/exec.ts
//
// Real process-execution adapters (node:child_process). These are the concrete
// implementations injected into the gauntlet (CommandRunner) and worktree
// (GitRunner) seams. No new dependencies — child_process is built in.
//
// - runCommand: shell-enabled (gauntlet commands chain with && etc.).
// - runGit: explicit argv, shell:false (no injection surface for git).
//
// Neither throws: a spawn error resolves to exitCode -1 so callers stay
// fail-closed.

import { spawn } from 'node:child_process'

export interface ExecOutcome {
  exitCode: number
  stdout: string
  stderr: string
}

function collect(
  cmd: string,
  args: string[] | undefined,
  cwd: string,
  shell: boolean,
): Promise<ExecOutcome> {
  return new Promise((resolve) => {
    const child = args ? spawn(cmd, args, { cwd, shell }) : spawn(cmd, { cwd, shell })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('error', (err) => {
      resolve({ exitCode: -1, stdout, stderr: stderr + (err instanceof Error ? err.message : String(err)) })
    })
    child.on('close', (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr })
    })
  })
}

/** Run a shell command in `cwd`. Implements the gauntlet's CommandRunner. */
export function runCommand(command: string, cwd: string): Promise<ExecOutcome> {
  return collect(command, undefined, cwd, true)
}

/** Run `git <args>` in `cwd` (no shell). Implements the worktree's GitRunner. */
export function runGit(args: string[], cwd: string): Promise<ExecOutcome> {
  return collect('git', args, cwd, false)
}

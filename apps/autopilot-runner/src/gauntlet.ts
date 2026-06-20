// apps/autopilot-runner/src/gauntlet.ts
//
// The gauntlet runner: re-runs the verification commands (build / type-check /
// test) inside the worktree and reports a typed result. This encodes the
// runner's core safety principle (spec §4): a worker's "green" is UNCONFIRMED
// until the runner re-runs the gauntlet itself.
//
// Command execution is dependency-injected (CommandRunner) so the orchestration
// is fully unit-tested without spawning processes. Fail-closed: stops at the
// first non-zero exit, a thrown runner is a failure, and an EMPTY command list
// is NOT a pass (running nothing must never report green).

export interface CommandOutcome {
  exitCode: number
  stdout: string
  stderr: string
}

export interface CommandResult extends CommandOutcome {
  command: string
}

/** Runs one shell command in `cwd` and resolves its outcome. Injected. */
export type CommandRunner = (command: string, cwd: string) => Promise<CommandOutcome>

export interface GauntletResult {
  passed: boolean
  results: CommandResult[]
  /** The command that failed (or the sentinel reason), or null when all passed. */
  failedAt: string | null
}

export interface RunGauntletDeps {
  run: CommandRunner
  cwd: string
}

/**
 * Run the gauntlet commands in order, stopping at the first failure.
 *
 * - All commands exit 0 → `{ passed: true, failedAt: null }`.
 * - A command exits non-zero → stop; `passed: false`, `failedAt` = that command.
 * - The runner throws → treat as exit -1; `passed: false`.
 * - Empty command list → `passed: false` (fail-closed: nothing run is not green).
 */
export async function runGauntlet(deps: RunGauntletDeps, commands: string[]): Promise<GauntletResult> {
  if (commands.length === 0) {
    return { passed: false, results: [], failedAt: '(no gauntlet commands)' }
  }

  const results: CommandResult[] = []
  for (const command of commands) {
    let outcome: CommandOutcome
    try {
      outcome = await deps.run(command, deps.cwd)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ command, exitCode: -1, stdout: '', stderr: message })
      return { passed: false, results, failedAt: command }
    }

    results.push({ command, ...outcome })
    if (outcome.exitCode !== 0) {
      return { passed: false, results, failedAt: command }
    }
  }

  return { passed: true, results, failedAt: null }
}

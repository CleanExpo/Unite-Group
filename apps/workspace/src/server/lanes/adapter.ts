/**
 * LaneAdapter — the uniform execution interface behind a lane. Slice 2 ships
 * the gateway adapter; the CLI adapter (Slice 3) implements the same shape so
 * the orchestrator drives both identically.
 */
import type { Lane } from './types'

export interface RunResult {
  output: string
}

export interface LaneAdapter {
  /** Run a mission in the lane's worktree. Throws on failure. */
  run(lane: Lane, mission: string): Promise<RunResult>
}

/**
 * Lane Orchestrator — shared types.
 * A "lane" is one model-backed IDE generated from Mission Control. Two kinds:
 *  - gateway: routed through the Hermes gateway to an API provider (MiniMax/OpenRouter/...).
 *  - cli: a supervised CLI coding agent (Claude Code / Codex) for subscription plans.
 * Slice 1 covers the model + lifecycle + worktree isolation only (no execution).
 */

export type LaneKind = 'gateway' | 'cli'

export type LaneStatus =
  | 'creating'
  | 'idle'
  | 'running'
  | 'blocked'
  | 'error'
  | 'stopped'

export type GatewayBackend = {
  kind: 'gateway'
  provider: string // e.g. 'minimax' | 'openrouter' | 'anthropic' | 'openai'
  model: string
}

export type CliBackend = {
  kind: 'cli'
  tool: 'claude-code' | 'codex'
  account: string // e.g. 'max-1' | 'max-2' | 'max-3' | 'openai-pro'
}

export type LaneBackend = GatewayBackend | CliBackend

export interface Lane {
  id: string
  kind: LaneKind
  backend: LaneBackend
  role: string // builder | reviewer | research | ...
  repo: string // absolute repo path
  worktree: string // own worktree path
  branch: string // own branch
  status: LaneStatus
  mission?: string
  lastOutput?: string
  startedAt?: number
  usage?: { tokens?: number; note?: string }
  blockedReason?: string
}

/** Input to create a lane (the "New IDE" wizard payload). */
export interface CreateLaneInput {
  kind: LaneKind
  backend: LaneBackend
  role: string
  repo: string
}

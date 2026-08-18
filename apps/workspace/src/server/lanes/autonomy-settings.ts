/**
 * Settings that attach the autonomy gate to a Claude Code lane — UNI-2409.
 *
 * `claude --settings <file>` merges additional settings, and a `PreToolUse`
 * hook there runs before every tool call. That is the enforcement boundary the
 * ticket asks for: not a policy stamp the model is asked to respect, but a
 * process that runs first and can refuse.
 *
 * ## Why the matcher is `.*`
 *
 * A matcher listing the tools we consider dangerous is the deny-list mistake
 * one level up: any tool not on the list — an MCP tool, a plugin, something a
 * CLI upgrade adds — would never reach the classifier at all, and the gate
 * would be silently absent for exactly the tools nobody has vetted. Matching
 * everything means the classifier decides, and the classifier already escalates
 * what it does not recognise.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path to the hook entry, resolved from this module's own location. */
export function autonomyHookPath(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'autonomy-hook.mjs')
}

export interface AutonomySettings {
  hooks: {
    PreToolUse: Array<{
      matcher: string
      hooks: Array<{ type: 'command'; command: string }>
    }>
  }
}

/**
 * Build the settings object for a lane.
 *
 * `nodeBin` defaults to the Node running the workspace, so the hook cannot be
 * hijacked by a `node` earlier on the lane's PATH — the same reason
 * `start-operator.sh` resolves its interpreter absolutely.
 */
export function buildAutonomySettings(
  hookPath: string = autonomyHookPath(),
  nodeBin: string = process.execPath,
): AutonomySettings {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: '.*',
          hooks: [{ type: 'command', command: `${quote(nodeBin)} ${quote(hookPath)}` }],
        },
      ],
    },
  }
}

/** Quote a path for the shell the hook command is run through. */
export function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export interface AutonomyEnvInput {
  requestId: string
  adapter: 'claude-code' | 'codex' | 'hermes'
  approvalsFile?: string
  auditFile?: string
}

/** Environment the hook reads. Approvals come from a file, never from the model. */
export function autonomyEnv(input: AutonomyEnvInput): NodeJS.ProcessEnv {
  return {
    NEXUS_LANE_REQUEST_ID: input.requestId,
    NEXUS_LANE_ADAPTER: input.adapter,
    ...(input.approvalsFile ? { NEXUS_APPROVALS_FILE: input.approvalsFile } : {}),
    ...(input.auditFile ? { NEXUS_GATE_AUDIT_FILE: input.auditFile } : {}),
  }
}

/** One decision as the hook records it. */
export interface GateAuditRecord {
  at: string
  requestId: string
  adapter: string
  tier: string
  allowed: boolean
  safeSummary: string
  reason: string
  failedClosed: boolean
}

/**
 * Read the decisions a run's hook recorded.
 *
 * A malformed line is skipped rather than thrown, unlike the run ledger: this
 * is an audit trail read for display, and refusing to show ANY decision because
 * one line is corrupt would hide the blocks it exists to surface.
 */
export function parseGateAudit(raw: string): GateAuditRecord[] {
  const records: GateAuditRecord[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as GateAuditRecord).safeSummary === 'string' &&
        typeof (parsed as GateAuditRecord).allowed === 'boolean'
      ) {
        records.push(parsed as GateAuditRecord)
      }
    } catch {
      // See above: one bad line must not blank the whole audit view.
    }
  }
  return records
}

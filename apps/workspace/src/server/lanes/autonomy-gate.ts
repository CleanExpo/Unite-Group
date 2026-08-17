/**
 * Autonomy-ladder enforcement at the tool-call boundary — UNI-2409.
 *
 * Every tool call a lane makes is classified into a tier before it runs:
 *
 *   L0  read / advise                        → allow, log
 *   L1  reversible, single-domain            → allow, record evidence
 *   L2  outward or cross-domain              → allow only with a verification stamp
 *   L3  merge, deploy, prod DB, secrets,
 *       spend, external publish, destructive → BLOCK pending founder/Board approval
 *
 * ## The one design decision everything rests on
 *
 * This is an ALLOW-LIST, not a deny-list.
 *
 * A deny-list of dangerous commands fails OPEN: every command the author did
 * not think of is permitted. Against an adversary — or just an LLM composing a
 * command nobody anticipated — that is not a control, it is a list of the
 * attacks someone already knew about. `git push` is easy to block; `g push`
 * where `g` is an alias, `bash deploy.sh`, `xargs git`, `eval "$CMD"` and
 * `find . -exec rm {} +` are not.
 *
 * So: a command is L0/L1 only if every executable in it is on a known-safe
 * list AND the command contains no construct that could smuggle another
 * command. Anything else escalates. Unknown does not mean safe; unknown means
 * "cannot classify", and the ticket requires failing closed on exactly that.
 *
 * The cost is false escalations — a harmless unrecognised command needs an
 * approval. That is the correct direction for the error to point.
 *
 * ## What this module does NOT do
 *
 * It classifies and decides. It never approves and never executes. Granting an
 * L3 approval is a founder action that happens elsewhere; this file only checks
 * whether a presented approval actually covers the exact action in hand.
 */
import { createHash } from 'node:crypto'

export type AutonomyTier = 'L0' | 'L1' | 'L2' | 'L3'

export const AUTONOMY_TIERS: readonly AutonomyTier[] = ['L0', 'L1', 'L2', 'L3']

export interface ToolCallRequest {
  /** Tool name as the CLI reports it, e.g. `Bash`, `Edit`, `WebFetch`. */
  tool: string
  /** Structured arguments as the CLI reports them. */
  input?: unknown
  /** Which adapter produced this call. */
  adapter: 'claude-code' | 'codex' | 'hermes'
  /** Identity of the request this call belongs to; scopes any approval. */
  requestId: string
}

export interface GateDecision {
  tier: AutonomyTier
  allowed: boolean
  /** Machine-readable reason. Never a bare boolean, so a block can be explained. */
  reason: string
  /** Safe to render in Mission Control: no secrets, no raw credential-bearing text. */
  safeSummary: string
  /** Set when the decision was reached by failing closed rather than by classification. */
  failedClosed?: boolean
}

// ── Tool classification ──────────────────────────────────────────────────────

/**
 * Tools that only read. `Bash` is deliberately absent: a shell is not a tool,
 * it is an arbitrary-tool factory, and is classified by its command below.
 */
const READ_ONLY_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'NotebookRead',
  'TodoRead',
  'ListMcpResources',
])

/** Tools that write inside the lane's own worktree — reversible, single-domain. */
const LANE_LOCAL_WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'TodoWrite'])

/** Tools that reach outside the machine but commit to nothing. */
const OUTWARD_READ_TOOLS = new Set(['WebFetch', 'WebSearch'])

/** Tools whose entire purpose is an irreversible or outward commitment. */
const ALWAYS_L3_TOOLS = new Set([
  'Bash(git push)',
  'SlackPostMessage',
  'SendEmail',
  'CreatePullRequest',
  'MergePullRequest',
])

// ── Shell command classification ─────────────────────────────────────────────

/**
 * Executables that cannot change state outside the working tree.
 *
 * Kept short on purpose. Every addition widens what runs unreviewed, so a name
 * belongs here only if it is read-only in EVERY invocation — which is why
 * `git` is absent (`git push`), `npm` is absent (`npm publish`, lifecycle
 * scripts) and `find` is absent (`-exec`, `-delete`).
 */
const SAFE_EXECUTABLES = new Set([
  'ls', 'pwd', 'cat', 'head', 'tail', 'wc', 'echo', 'date', 'whoami', 'hostname',
  'grep', 'rg', 'egrep', 'fgrep', 'diff', 'file', 'stat', 'basename', 'dirname',
  'sort', 'uniq', 'cut', 'tr', 'nl', 'seq', 'true', 'false', 'test', 'realpath',
])

/**
 * Read-only subcommands of executables that are otherwise dangerous. The pair
 * must match exactly: `git status` is safe, `git` alone is not.
 */
const SAFE_SUBCOMMANDS = new Map<string, Set<string>>([
  ['git', new Set(['status', 'log', 'diff', 'show', 'branch', 'remote', 'rev-parse', 'ls-files', 'blame'])],
  ['npm', new Set(['ls', 'list', 'view', 'outdated'])],
  ['node', new Set(['--version', '-v'])],
])

/**
 * Constructs that let one command become another.
 *
 * This is the heart of the control. Without it, `ls; rm -rf /` classifies on
 * `ls` and is allowed — the classic chaining bypass. Presence of any of these
 * means the command cannot be reasoned about executable-by-executable, so it
 * escalates regardless of how safe the first word looks.
 */
const SHELL_METACHARACTERS: ReadonlyArray<{ pattern: RegExp; name: string }> = [
  { pattern: /;/, name: 'command separator' },
  { pattern: /&&|\|\|/, name: 'conditional chaining' },
  { pattern: /\|/, name: 'pipe' },
  { pattern: /&(?!&)/, name: 'background execution' },
  { pattern: /\$\(|`/, name: 'command substitution' },
  { pattern: /\$\{[^}]*\}/, name: 'parameter expansion' },
  { pattern: />|</, name: 'redirection' },
  { pattern: /\n|\r/, name: 'newline' },
  { pattern: /\\\s*$/, name: 'line continuation' },
]

/**
 * Executables that run something else, so classifying them classifies nothing.
 * `xargs git` looks like `xargs`; `eval "$CMD"` looks like `eval`.
 */
const INDIRECTION_EXECUTABLES = new Set([
  'eval', 'exec', 'source', '.', 'sh', 'bash', 'zsh', 'dash', 'ksh', 'fish',
  'env', 'xargs', 'nohup', 'nice', 'time', 'timeout', 'watch', 'sudo', 'doas',
  'su', 'ssh', 'scp', 'rsync', 'find', 'make', 'npx', 'pnpx', 'bunx', 'python',
  'python3', 'perl', 'ruby', 'node', 'deno', 'bun',
])

/** Words that mark an outright irreversible or outward action. */
const L3_MARKERS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bgit\s+push\b/, reason: 'pushes to a remote' },
  { pattern: /\bgit\s+merge\b/, reason: 'merges a branch' },
  { pattern: /\bgh\s+pr\s+(merge|create|ready)\b/, reason: 'acts on a pull request' },
  { pattern: /\b(vercel|railway|fly|netlify|heroku)\b/, reason: 'deploys' },
  { pattern: /\bterraform\s+(apply|destroy)\b/, reason: 'mutates infrastructure' },
  { pattern: /\bkubectl\s+(apply|delete)\b/, reason: 'mutates a cluster' },
  { pattern: /\bnpm\s+publish\b/, reason: 'publishes a package' },
  { pattern: /\brm\s+-[a-z]*[rf]/, reason: 'recursive or forced delete' },
  { pattern: /\b(drop|truncate)\s+(table|database)\b/i, reason: 'destroys data' },
  { pattern: /\bpsql\b|\bmysql\b|\bmongosh\b/, reason: 'reaches a database directly' },
  { pattern: /\b(aws|gcloud|az)\b/, reason: 'reaches a cloud control plane' },
  { pattern: /\bcurl\b|\bwget\b/, reason: 'transfers data over the network' },
  { pattern: /\bchmod\s+[0-7]*7[0-7]{2}\b/, reason: 'grants world-writable permissions' },
  { pattern: /\b(shutdown|reboot|halt|mkfs|dd)\b/, reason: 'destructive system operation' },
]

/** Paths and names that mean a secret is being read. */
const SECRET_MARKERS: ReadonlyArray<RegExp> = [
  /\.env(\.[a-z0-9_-]+)?\b/i,
  /\bid_(rsa|ed25519|ecdsa|dsa)\b/,
  /\.ssh\//,
  /\.aws\/credentials\b/,
  /\.npmrc\b/,
  /\bcredentials?\.json\b/i,
  /\b(secret|token|apikey|api_key|password)s?\b/i,
]

export interface CommandClassification {
  tier: AutonomyTier
  reason: string
}

/**
 * Classify a shell command string.
 *
 * Order matters: an explicit L3 marker wins over everything, because
 * `ls && git push` must not be rescued by looking safe at the front. Then
 * anything that could smuggle a second command escalates. Only a single,
 * fully-recognised, metacharacter-free command can reach L0/L1.
 */
export function classifyShellCommand(command: unknown): CommandClassification {
  if (typeof command !== 'string' || command.trim() === '') {
    return { tier: 'L3', reason: 'command is missing or not a string; cannot classify' }
  }
  const trimmed = command.trim()

  for (const marker of L3_MARKERS) {
    if (marker.pattern.test(trimmed)) {
      return { tier: 'L3', reason: `command ${marker.reason}` }
    }
  }
  for (const marker of SECRET_MARKERS) {
    if (marker.test(trimmed)) {
      return { tier: 'L3', reason: 'command references credential material' }
    }
  }
  for (const meta of SHELL_METACHARACTERS) {
    if (meta.pattern.test(trimmed)) {
      return {
        tier: 'L3',
        reason: `command contains a ${meta.name}; a chained command cannot be classified from its first word`,
      }
    }
  }

  const words = trimmed.split(/\s+/)
  // `FOO=bar cmd` — an assignment prefix hides the real executable, and can set
  // PATH or LD_PRELOAD to redirect a name that looks safe.
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] ?? '')) {
    return { tier: 'L3', reason: 'command is prefixed with an environment assignment' }
  }

  const executable = (words[0] ?? '').split('/').pop() ?? ''
  if (executable === '') {
    return { tier: 'L3', reason: 'command has no resolvable executable' }
  }
  if (INDIRECTION_EXECUTABLES.has(executable)) {
    return {
      tier: 'L3',
      reason: `'${executable}' runs another command, so classifying it classifies nothing`,
    }
  }
  if (SAFE_EXECUTABLES.has(executable)) {
    return { tier: 'L0', reason: `'${executable}' is a known read-only command` }
  }
  const subcommands = SAFE_SUBCOMMANDS.get(executable)
  if (subcommands) {
    const subcommand = words[1] ?? ''
    if (subcommands.has(subcommand)) {
      return { tier: 'L0', reason: `'${executable} ${subcommand}' is a known read-only command` }
    }
    return {
      tier: 'L3',
      reason: `'${executable} ${subcommand || '(no subcommand)'}' is not a known read-only subcommand`,
    }
  }
  // The whole point: unrecognised is not safe.
  return {
    tier: 'L3',
    reason: `'${executable}' is not on the known-safe list; unrecognised commands are not assumed safe`,
  }
}

// ── Tool-call classification ─────────────────────────────────────────────────

function readCommand(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return undefined
  return (input as Record<string, unknown>).command
}

function readPath(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const record = input as Record<string, unknown>
  for (const key of ['file_path', 'path', 'notebook_path', 'filePath']) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return ''
}

/** Classify any tool call. Unknown tools fail closed to L3. */
export function classifyToolCall(request: ToolCallRequest): CommandClassification {
  const tool = typeof request.tool === 'string' ? request.tool.trim() : ''
  if (tool === '') {
    return { tier: 'L3', reason: 'tool name is missing; cannot classify' }
  }
  if (ALWAYS_L3_TOOLS.has(tool)) {
    return { tier: 'L3', reason: `'${tool}' is an irreversible or outward action` }
  }
  if (tool === 'Bash' || tool === 'Shell' || tool === 'Terminal') {
    return classifyShellCommand(readCommand(request.input))
  }

  const path = readPath(request.input)
  if (path !== '') {
    for (const marker of SECRET_MARKERS) {
      if (marker.test(path)) {
        return { tier: 'L3', reason: 'tool targets credential material' }
      }
    }
  }

  if (READ_ONLY_TOOLS.has(tool)) return { tier: 'L0', reason: `'${tool}' only reads` }
  if (LANE_LOCAL_WRITE_TOOLS.has(tool)) {
    return { tier: 'L1', reason: `'${tool}' writes inside the lane worktree` }
  }
  if (OUTWARD_READ_TOOLS.has(tool)) {
    return { tier: 'L2', reason: `'${tool}' reaches outside the machine` }
  }
  // An MCP tool, a plugin, a tool added in a CLI upgrade: all unknown, all
  // escalated. A gate that permits what it has never seen is not a gate.
  return {
    tier: 'L3',
    reason: `'${tool}' is not a classified tool; unrecognised tools are not assumed safe`,
  }
}

// ── Approvals ────────────────────────────────────────────────────────────────

export interface ApprovalGrant {
  /** The request this approval was granted for. */
  requestId: string
  /** Hash of the exact action approved. */
  actionHash: string
  /** Who granted it. */
  grantedBy: string
  /** Epoch ms after which the grant is no longer valid. */
  expiresAt: number
}

/**
 * Fingerprint the exact action.
 *
 * Includes the tool, the adapter and the full argument payload, so an approval
 * for `Bash{command:"git push origin feature"}` cannot be replayed for
 * `Bash{command:"git push origin main --force"}`. Approving a *class* of action
 * is precisely the hole this closes.
 */
export function actionHash(request: ToolCallRequest): string {
  const canonical = JSON.stringify({
    tool: request.tool,
    adapter: request.adapter,
    input: stableSort(request.input),
  })
  return createHash('sha256').update(canonical).digest('hex')
}

/** Stable key ordering, so argument order cannot change the fingerprint. */
function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort)
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) out[key] = stableSort(record[key])
    return out
  }
  return value
}

export interface GateOptions {
  /** Approvals presented for this call. Absent means none. */
  approvals?: readonly ApprovalGrant[]
  /** True when an L2 verification stamp is present for this action. */
  verificationStamp?: boolean
  now?: () => number
}

/**
 * Decide whether a tool call may execute.
 *
 * Never throws: a gate that can throw is a gate that can be crashed open. Any
 * internal failure resolves to a blocked L3 decision marked `failedClosed`.
 */
export function evaluateToolCall(
  request: ToolCallRequest,
  options: GateOptions = {},
): GateDecision {
  const now = options.now ?? (() => Date.now())
  try {
    if (!request || typeof request.requestId !== 'string' || request.requestId.trim() === '') {
      return {
        tier: 'L3',
        allowed: false,
        reason: 'request identity is missing; an action with no request cannot be approved or audited',
        safeSummary: 'blocked: unidentified request',
        failedClosed: true,
      }
    }

    const { tier, reason } = classifyToolCall(request)
    const summary = safeSummary(request, tier)

    if (tier === 'L0' || tier === 'L1') {
      return { tier, allowed: true, reason, safeSummary: summary }
    }

    if (tier === 'L2') {
      if (options.verificationStamp === true) {
        return { tier, allowed: true, reason: `${reason}; verification stamp present`, safeSummary: summary }
      }
      return {
        tier,
        allowed: false,
        reason: `${reason}; L2 requires a verification stamp`,
        safeSummary: summary,
      }
    }

    const hash = actionHash(request)
    const grant = (options.approvals ?? []).find(
      (candidate) =>
        candidate.requestId === request.requestId &&
        candidate.actionHash === hash &&
        candidate.expiresAt > now(),
    )
    if (grant) {
      return {
        tier,
        allowed: true,
        reason: `${reason}; approved by ${grant.grantedBy} for this exact action`,
        safeSummary: summary,
      }
    }
    return {
      tier,
      allowed: false,
      reason: `${reason}; L3 requires founder or Board approval scoped to this exact action`,
      safeSummary: summary,
    }
  } catch (error) {
    return {
      tier: 'L3',
      allowed: false,
      reason: `classification failed (${error instanceof Error ? error.name : 'unknown'}); failing closed`,
      safeSummary: 'blocked: classification unavailable',
      failedClosed: true,
    }
  }
}

/**
 * A one-line description safe to render in Mission Control.
 *
 * Deliberately does NOT include the argument payload: a blocked call is often
 * blocked precisely because it touches credential material, and echoing the
 * command into the dashboard would leak the thing the block was protecting.
 */
export function safeSummary(request: ToolCallRequest, tier: AutonomyTier): string {
  const tool = typeof request?.tool === 'string' && request.tool.trim() !== '' ? request.tool : 'unknown tool'
  return `${tier} · ${tool} · ${request?.adapter ?? 'unknown adapter'}`
}

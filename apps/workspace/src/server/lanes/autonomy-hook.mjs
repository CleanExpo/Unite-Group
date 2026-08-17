#!/usr/bin/env node
/**
 * PreToolUse enforcement entry for the autonomy ladder — UNI-2409.
 *
 * Claude Code runs this before every tool call in a lane. Contract, taken from
 * a working hook on this estate rather than from documentation:
 *
 *   stdin  : JSON `{ tool_name, tool_input, ... }`
 *   exit 0 : allow
 *   exit 2 : BLOCK — stderr is shown to the model as the reason
 *
 * Any other exit code is not a denial, so every failure path here must end at
 * 2. That is the whole point: a hook that crashes with exit 1 lets the tool
 * run, which turns a broken gate into an open one. There is exactly one
 * `process.exit(0)` in this file and it is reached only by an explicit allow.
 *
 * Written as `.mjs` importing a `.ts` classifier through Node's type stripping,
 * the same pattern `scripts/control-plane-contract.mjs` already uses. That
 * keeps ONE classifier shared by the gate, its tests and this hook — a
 * hand-copied second copy in the enforcement path is how a gate and its tests
 * quietly stop agreeing.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { evaluateToolCall } from './autonomy-gate.ts'

const BLOCK = 2
const ALLOW = 0

/** Refuse, loudly and in the one way the CLI understands. */
function block(reason) {
  process.stderr.write(`Autonomy gate BLOCKED: ${reason}\n`)
  process.exit(BLOCK)
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/**
 * Approvals are read from a file the operator controls, never from the payload.
 * A tool call that could carry its own approval would be a tool call that can
 * approve itself.
 */
function loadApprovals(path) {
  if (!path) return []
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch (error) {
    // A file that does not exist yet is the NORMAL state: nothing has been
    // approved for this run. Treating that as unknown would block every lane
    // before a single approval was ever granted — a gate so strict it is
    // useless gets switched off, which is its own failure mode.
    if (error && error.code === 'ENOENT') return []
    // Anything else — permissions, I/O — is genuinely unknown, not empty.
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    // A non-array is a malformed approvals file, not an empty one.
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Append the decision so Mission Control can show what was blocked, and why. */
function audit(path, record) {
  if (!path) return
  try {
    appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf8')
  } catch {
    // An unwritable audit log must not become a way to make the gate fail
    // open; the decision still stands, it just goes unrecorded here.
  }
}

function main() {
  const raw = readStdin()
  if (raw.trim() === '') block('empty hook payload; cannot classify')

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    block('malformed hook payload; cannot classify')
    return
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    block('hook payload is not an object; cannot classify')
  }

  const requestId = (process.env.NEXUS_LANE_REQUEST_ID || '').trim()
  if (requestId === '') {
    block('lane request id is not set; an action with no request cannot be audited')
  }
  const adapter = (process.env.NEXUS_LANE_ADAPTER || '').trim()
  if (adapter !== 'claude-code' && adapter !== 'codex' && adapter !== 'hermes') {
    block(`lane adapter '${adapter || '(unset)'}' is not recognised; cannot classify`)
  }

  const approvals = loadApprovals(process.env.NEXUS_APPROVALS_FILE)
  if (approvals === null) {
    block('approvals file is unreadable; refusing to proceed in an unknown approval state')
  }

  const request = {
    tool: typeof payload.tool_name === 'string' ? payload.tool_name : '',
    input: payload.tool_input,
    adapter,
    requestId,
  }

  const decision = evaluateToolCall(request, { approvals })
  audit(process.env.NEXUS_GATE_AUDIT_FILE, {
    at: new Date().toISOString(),
    requestId,
    adapter,
    tier: decision.tier,
    allowed: decision.allowed,
    // safeSummary deliberately omits arguments: a blocked call is often blocked
    // BECAUSE it touches credential material.
    safeSummary: decision.safeSummary,
    reason: decision.reason,
    failedClosed: decision.failedClosed === true,
  })

  if (decision.allowed) process.exit(ALLOW)
  block(`${decision.safeSummary} — ${decision.reason}`)
}

try {
  main()
} catch (error) {
  // Never let an unexpected throw become an exit code that means "allow".
  process.stderr.write(
    `Autonomy gate BLOCKED: gate failed (${error instanceof Error ? error.name : 'unknown'}); failing closed\n`,
  )
  process.exit(BLOCK)
}

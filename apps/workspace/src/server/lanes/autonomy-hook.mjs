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
import { appendFileSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
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

/**
 * Follow symlinks to the real file, walking the path one component at a time
 * the way the kernel does: a link is followed BEFORE a later `..` applies, so
 * `link/../x` means "the parent of where link points", not "x beside link".
 * Collapsing `..` first (path.resolve) was a bypass (Codex review r4). Once a
 * component does not exist, the rest is joined as written: there is nothing on
 * disk left to follow.
 */
function makeResolver(base) {
  return (target) => {
    // The shell expands a leading `~` before the program sees the path.
    const expanded = target === '~' || target.startsWith('~/') ? path.join(homedir(), target.slice(1)) : target
    // Joined as text, not with path.join, which would also collapse `..`.
    const absolute = path.isAbsolute(expanded) ? expanded : `${base}/${expanded}`
    const root = path.parse(absolute).root || '/'
    const parts = absolute.slice(root.length).split(/[\\/]+/).filter((part) => part !== '')
    let current = root
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      if (part === '.') continue
      if (part === '..') {
        current = path.dirname(current)
        continue
      }
      const next = path.join(current, part)
      try {
        // The OS's own resolution: on Windows it also expands 8.3 short names
        // (`CODEX~1`), which the JavaScript walk leaves as written.
        current = realpathSync.native(next)
      } catch {
        return path.join(next, ...parts.slice(i + 1))
      }
    }
    return current
  }
}

/**
 * True when a target is an existing regular file with more than one hard link:
 * another name for it may be `.env` or a file outside the lane (Codex review
 * r21). A target that does not exist yet has no other name.
 */
function makeSharedFileCheck(resolvePath) {
  return (target) => {
    try {
      const stats = statSync(resolvePath(target))
      return stats.isFile() && stats.nlink > 1
    } catch {
      return false
    }
  }
}

/** Directories whose programs are system binaries, not files a lane wrote. */
const SYSTEM_BIN_DIRS = ['/bin', '/usr/bin', '/usr/local/bin', '/sbin', '/usr/sbin', '/opt/homebrew/bin']

function realOrNull(p) {
  try {
    return realpathSync(p)
  } catch {
    return null
  }
}

/**
 * Find the program the shell will start for `word`, as the shell does: an
 * explicit path as written (relative to `base`), a bare name through PATH in
 * order, a relative or empty entry taken from the working directory. It is
 * trusted only if it really lives in a system bin directory, so a program the
 * working directory supplies (`./node_modules/.bin/cat`) is never trusted.
 */
function makeExecutableTrust(base, resolvePath) {
  const systemDirs = new Set(SYSTEM_BIN_DIRS.map(realOrNull).filter(Boolean))
  return (word) => {
    let candidate = null
    if (word.includes('/')) {
      candidate = resolvePath(word)
    } else {
      for (const entry of (process.env.PATH || '').split(':')) {
        // An empty or relative entry is searched from the working directory,
        // as the shell does; a match there is judged like any other.
        const dir = path.isAbsolute(entry) ? entry : path.resolve(base, entry)
        const file = path.join(dir, word)
        try {
          if (statSync(file).isFile()) {
            candidate = file
            break
          }
        } catch {
          // not in this directory; keep looking
        }
      }
    }
    if (candidate === null) return false
    const real = realOrNull(candidate)
    return real !== null && systemDirs.has(path.dirname(real))
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

  // The lane's own worktree, set by the adapter. Relative targets and the
  // resolver start from it; without it they start from the CLI's cwd.
  const worktreeRoot = (process.env.NEXUS_LANE_WORKTREE_ROOT || '').trim() || undefined
  const base = worktreeRoot || (typeof payload.cwd === 'string' ? payload.cwd : process.cwd())
  const resolvePath = makeResolver(base)
  const decision = evaluateToolCall(request, {
    approvals,
    worktreeRoot,
    resolvePath,
    trustExecutable: makeExecutableTrust(base, resolvePath),
    isSharedFile: makeSharedFileCheck(resolvePath),
  })
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

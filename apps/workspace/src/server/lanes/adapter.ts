/**
 * LaneAdapter — the uniform execution interface behind a lane. Slice 2 ships
 * the gateway adapter; the CLI adapter (Slice 3) implements the same shape so
 * the orchestrator drives both identically.
 */
import { stripVTControlCharacters } from 'node:util'
import type { Lane } from './types'

export const LANE_OUTPUT_LIMIT = 64 * 1024

export class StopNotAcknowledgedError extends Error {
  override name = 'StopNotAcknowledgedError'
}

function utf8Prefix(value: string, limit: number): string {
  let output = ''
  let size = 0
  for (const character of value) {
    const characterSize = Buffer.byteLength(character, 'utf8')
    if (size + characterSize > limit) break
    output += character
    size += characterSize
  }
  return output
}

export function truncateUtf8(
  value: string,
  limit: number,
  marker = '\n[output truncated]',
): string {
  if (Buffer.byteLength(value, 'utf8') <= limit) return value
  if (limit <= 0) return ''
  if (Buffer.byteLength(marker, 'utf8') >= limit) {
    return utf8Prefix(marker, limit)
  }
  const contentLimit = Math.max(0, limit - Buffer.byteLength(marker, 'utf8'))
  return `${utf8Prefix(value, contentLimit)}${marker}`
}

/** Defence-in-depth sanitiser used before any adapter output or error reaches a ledger or API. */
export function sanitiseLaneOutput(
  value: string,
  limit: number = LANE_OUTPUT_LIMIT,
): string {
  const redacted = stripVTControlCharacters(value)
    .replace(
      /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?(?:-----END(?: [A-Z0-9]+)? PRIVATE KEY-----|$)/gi,
      '[REDACTED]',
    )
    .replace(
      /(?:\/Users\/|\/home\/)[^\s"'`,;)}\]]+/g,
      '[REDACTED_PATH]',
    )
    .replace(
      /(?:\/private)?\/var\/folders\/[^\s"'`,;)}\]]+/g,
      '[REDACTED_PATH]',
    )
    .replace(
      /[A-Z]:\\Users\\[^\s"'`,;)}\]]+/gi,
      '[REDACTED_PATH]',
    )
    .replace(
      /(["']?authorization["']?\s*[:=]\s*["']?)(?:bearer|basic)\s+([^"'\s,}]+)(["']?)/gi,
      '$1[REDACTED]$3',
    )
    .replace(
      /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD))\s*=\s*[^\s]+/gi,
      '$1=[REDACTED]',
    )
    .replace(/:\/\/[^/\s@]+@/g, '://[REDACTED]@')
    .replace(
      /\b(?:sk-|gh[opusr]_|github_pat_|xox[baprs]-|A(?:KI|SI)A|AIza|(?:sk|rk)_live_|whsec_|(?:gsk_|hf_)|lin_api_|sb_(?:secret|publishable)_)[A-Za-z0-9._-]*$/g,
      '[REDACTED]',
    )
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{16,}|(?:gh[opusr]|github_pat)_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|A(?:KI|SI)A[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{20,}|(?:sk|rk)_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|(?:gsk_|hf_)[A-Za-z0-9_-]{16,}|(?:lin_api|sb_(?:secret|publishable))_[A-Za-z0-9._-]{8,})\b/g,
      '[REDACTED]',
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      '[REDACTED]',
    )
    .replace(
      /(["']?(?:api[-_]?key|access[-_]?token|refresh[-_]?token|auth(?:orization)?|client[-_]?secret|password|secret|token)["']?\s*[:=]\s*)(["']?)([^"'\s,}]+)\2/gi,
      '$1$2[REDACTED]$2',
    )

  return truncateUtf8(redacted, limit)
}

export interface RunResult {
  output: string
}

export interface LaneRunOptions {
  /** Aborting must terminate the supervised child before the run settles. */
  signal?: AbortSignal
}

export interface LaneAdapter {
  /** Run a mission in the lane's worktree. Throws on failure. */
  run: (
    lane: Lane,
    mission: string,
    options?: LaneRunOptions,
  ) => Promise<RunResult>
}

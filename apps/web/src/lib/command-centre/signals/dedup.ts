// src/lib/command-centre/signals/dedup.ts
//
// Signal ingestion — Unit 2 (pure). Gate that decides whether a normalised
// signal should become a `proposed` task. Drops duplicates (by external_ref),
// empties, and obvious transport noise (heartbeats, bot echoes, bare emoji
// reactions). No I/O — the caller supplies the recently-seen refs.

import type { NormalisedSignal } from './normalise'

export interface IngestDecision {
  ingest: boolean
  reason?: 'duplicate' | 'empty' | 'noise'
}

/** Exact tokens that are never worth a task on their own. */
const NOISE_TOKENS = new Set(['ok', 'okay', 'ping', 'pong', 'heartbeat', 'ack', 'noop'])

export function shouldIngest(signal: NormalisedSignal, recentRefs: readonly string[]): IngestDecision {
  const trimmed = signal.objective.trim()
  if (!trimmed) return { ingest: false, reason: 'empty' }

  // Bare noise: an exact heartbeat/echo token, or text with no alphanumeric
  // content at all (e.g. a lone emoji reaction).
  const lower = trimmed.toLowerCase()
  const hasWordChar = /[a-z0-9]/i.test(trimmed)
  if (NOISE_TOKENS.has(lower) || !hasWordChar) return { ingest: false, reason: 'noise' }

  if (recentRefs.includes(signal.externalRef)) return { ingest: false, reason: 'duplicate' }

  return { ingest: true }
}

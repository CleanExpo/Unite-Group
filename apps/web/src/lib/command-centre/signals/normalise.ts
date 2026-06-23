// src/lib/command-centre/signals/normalise.ts
//
// Signal ingestion — Unit 1 (pure). Maps a raw inbound signal (Telegram / cron
// evidence / error / health) onto the shape the existing idea-intake pipeline
// consumes. Deliberately uses ONLY existing valid `TaskOrigin` values
// ('idea' | 'blocker') — cc_tasks.origin carries a CHECK constraint, so adding
// a 'signal' origin would need a gated prod migration. Provenance instead rides
// on `external_ref` (the dedup key) + task metadata, set by the route.
//
// No I/O. Fully unit-testable.

export type SignalSource = 'telegram' | 'cron' | 'health' | 'error'
export type SignalSeverity = 'info' | 'warning' | 'critical'

export interface RawSignal {
  /** Where the signal came from. */
  source: SignalSource
  /** The transport's own id (message id, cron run id) — the dedup key. */
  externalRef: string
  /** The signal body. */
  text: string
  /** ISO timestamp the signal was observed. */
  observedAt: string
  /** Optional severity; defaults to 'info'. */
  severity?: SignalSeverity
  /** Optional project key to scope the resulting task to. */
  projectKey?: string
}

export interface NormalisedSignal {
  title: string
  objective: string
  /** An existing valid TaskOrigin — never a new value. */
  origin: 'idea' | 'blocker'
  externalRef: string
  projectKey: string | null
  source: SignalSource
  severity: SignalSeverity
  observedAt: string
}

const TITLE_CAP = 80

/** Concise title: first line, single-spaced, capped at 80 chars with ellipsis. */
function deriveTitle(text: string): string {
  const firstLine = text.trim().split(/\r?\n/)[0]?.trim() ?? ''
  const clean = firstLine.replace(/\s+/g, ' ')
  if (clean.length <= TITLE_CAP) return clean || 'Untitled signal'
  return `${clean.slice(0, TITLE_CAP - 3)}...`
}

export function normaliseSignal(raw: RawSignal): NormalisedSignal {
  const severity: SignalSeverity = raw.severity ?? 'info'
  // Errors, health checks, and warning/critical severities are blockers; an
  // informational message or enhancement is an idea.
  const isBlocker = raw.source === 'error' || raw.source === 'health' || severity === 'warning' || severity === 'critical'

  return {
    title: deriveTitle(raw.text),
    objective: raw.text,
    origin: isBlocker ? 'blocker' : 'idea',
    externalRef: raw.externalRef,
    projectKey: raw.projectKey ?? null,
    source: raw.source,
    severity,
    observedAt: raw.observedAt,
  }
}

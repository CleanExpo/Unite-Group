// src/app/(founder)/founder/command-centre/AgentEventsWallTile.tsx
//
// Matrix wall Wave B2 (UNI-2384) — minimal agent-events wall feed. Server
// component: renders the founder's recent cc_agent_events newest-first
// (runner lifecycle status verbs + heartbeats). Read-only, honest states:
//
// - migration not applied (table missing) ⇒ calm "Wall dark" line — the
//   founder-gated migration hasn't run, so dark IS the truthful posture.
// - connected but zero rows ⇒ "runner not armed" — no fake activity.
// - rows ⇒ the newest event's age is stated plainly so stale data can never
//   read as live. No loading theatre, no fake "live" dots.
//
// Register mirrors EvidenceStreamTile (tile-ink tokens, monospace table,
// 2px radii only).

import type { AgentEventsWallResult } from '@/lib/command-centre/agent-events-wall'
import { eventVerb, relativeAge } from '@/lib/command-centre/agent-events-wall'

const VERB_COLOURS: Record<string, string> = {
  draft_pr_opened: 'var(--tile-green-txt, #34d399)',
  started: 'var(--tile-green-txt, #34d399)',
  aborted: 'var(--tile-amber-txt, #fb923c)',
  requeued: 'var(--tile-amber-txt, #fb923c)',
  heartbeat: 'var(--tile-ink-hush, #6f879b)',
}

function verbColour(verb: string): string {
  return VERB_COLOURS[verb] ?? 'var(--tile-ink, #e6f7ff)'
}

const quiet: React.CSSProperties = {
  color: 'var(--tile-ink-dim, #9bb0c1)',
  fontSize: '0.85rem',
  margin: 0,
}

export function AgentEventsWallTile({ data, nowMs }: { data: AgentEventsWallResult; nowMs: number }) {
  if (data.source === 'not_connected') {
    return (
      <p data-testid="agent-events-wall-dark" style={quiet}>
        {data.reason === 'migration_not_applied'
          ? 'Wall dark — cc_agent_events migration not applied'
          : 'Wall dark — sign in to view agent events'}
      </p>
    )
  }

  if (data.source === 'error') {
    return (
      <p data-testid="agent-events-wall-error" style={quiet}>
        Agent events unavailable — {data.error ?? 'query failed'}
      </p>
    )
  }

  if (data.events.length === 0) {
    return (
      <p data-testid="agent-events-wall-empty" style={quiet}>
        No agent events yet — runner not armed
      </p>
    )
  }

  const newest = data.events[0]

  return (
    <div data-testid="agent-events-wall">
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          color: 'var(--tile-ink-hush, #6f879b)',
          fontSize: '0.72rem',
          marginBottom: '0.4rem',
        }}
      >
        <span>newest event {relativeAge(newest.created_at, nowMs)}</span>
        <span>· {data.events.length} shown, newest first</span>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        }}
      >
        <thead>
          <tr style={{ color: 'var(--tile-ink-hush, #6f879b)', textAlign: 'left' }}>
            <th style={{ padding: '0.2rem 0.4rem', fontWeight: 500 }}>when</th>
            <th style={{ padding: '0.2rem 0.4rem', fontWeight: 500 }}>agent</th>
            <th style={{ padding: '0.2rem 0.4rem', fontWeight: 500 }}>event</th>
            <th style={{ padding: '0.2rem 0.4rem', fontWeight: 500 }}>target</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map((e) => {
            const verb = eventVerb(e)
            return (
              <tr key={e.id} data-event-id={e.id}>
                <td style={{ padding: '0.2rem 0.4rem', color: 'var(--tile-ink-dim, #9bb0c1)', whiteSpace: 'nowrap' }}>
                  {relativeAge(e.created_at, nowMs)}
                </td>
                <td style={{ padding: '0.2rem 0.4rem', color: 'var(--tile-ink, #e6f7ff)' }}>{e.agent_name}</td>
                <td style={{ padding: '0.2rem 0.4rem' }}>
                  <span
                    data-verb={verb}
                    style={{
                      display: 'inline-block',
                      padding: '0.05rem 0.4rem',
                      borderRadius: '2px',
                      border: '1px solid rgba(155, 176, 193, 0.25)',
                      color: verbColour(verb),
                    }}
                  >
                    {verb}
                  </span>
                </td>
                <td style={{ padding: '0.2rem 0.4rem', color: 'var(--tile-ink-dim, #9bb0c1)' }}>{e.target ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

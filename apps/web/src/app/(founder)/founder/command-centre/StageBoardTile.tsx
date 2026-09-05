// src/app/(founder)/founder/command-centre/StageBoardTile.tsx
//
// Mission Control Day 1 — "Projects by stage".
//
// Server component. One row per Linear team, each carrying exactly one of
// the founder's five words — Planning · Research · Develop · Production ·
// Done — the open-issue count behind every word, and the next issue in the
// team's current stage. The same table prints in the CLI via
// `node scripts/stage.mjs`. Read-only. Linear not configured or failing →
// an honest unavailable state, never a fabricated board.

import { fetchTeamStages, STAGE_MAP, type TeamStage } from '@/lib/command-centre/project-stages'

export interface StageBoardData {
  checked_at: string
  teams: TeamStage[]
  not_configured: boolean
  read_error: string | null
}

/** Server-side loader. NEVER throws; a failed read lands in read_error. */
export async function loadStageBoardData(now: () => Date = () => new Date()): Promise<StageBoardData> {
  try {
    const result = await fetchTeamStages({ now })
    if (result.ok === 'not_configured') {
      return { checked_at: now().toISOString(), teams: [], not_configured: true, read_error: null }
    }
    if (!result.ok) {
      return { checked_at: now().toISOString(), teams: [], not_configured: false, read_error: `Linear: ${result.error}` }
    }
    return { checked_at: result.checkedAt, teams: result.teams, not_configured: false, read_error: null }
  } catch (err: unknown) {
    return {
      checked_at: now().toISOString(),
      teams: [],
      not_configured: false,
      read_error: err instanceof Error ? err.message : String(err),
    }
  }
}

const STAGE_COLOUR: Record<TeamStage['stage'], string> = {
  Planning: 'var(--tile-ink-dim, #9bb0c1)',
  Research: 'var(--deck-cyan, #22d3ee)',
  Develop: 'var(--tile-amber-txt, #fb923c)',
  Production: '#a78bfa',
  Done: 'var(--tile-green-txt, #34d399)',
}

const checkedAtStyle = {
  marginLeft: 'auto',
  fontSize: '0.66rem',
  color: 'var(--tile-ink-hush, #6f879b)',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
} as const

export function StageBoardTile({ data }: { data: StageBoardData }) {
  if (data.not_configured) {
    return (
      <p data-testid="stage-board-tile-error" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
        Linear not connected (LINEAR_API_KEY not set) — no stage can be read.
        <span style={checkedAtStyle}> checked {data.checked_at}</span>
      </p>
    )
  }
  if (data.read_error) {
    return (
      <p data-testid="stage-board-tile-error" style={{ color: 'var(--tile-amber-txt, #fb923c)', fontSize: '0.85rem', margin: 0 }}>
        Stage board unavailable: {data.read_error}
        <span style={checkedAtStyle}> checked {data.checked_at}</span>
      </p>
    )
  }
  if (data.teams.length === 0) {
    return (
      <p data-testid="stage-board-tile-empty" style={{ color: 'var(--tile-ink-dim, #9bb0c1)', fontSize: '0.85rem', margin: 0 }}>
        Linear returned no teams.
        <span style={checkedAtStyle}> checked {data.checked_at}</span>
      </p>
    )
  }

  return (
    <div data-testid="stage-board-tile">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', color: 'var(--tile-ink-dim, #9bb0c1)', fontSize: '0.72rem', marginBottom: '0.3rem' }}>
        <span>{data.teams.length} teams · word = furthest-along stage with open work · same table as <code>/stage</code></span>
        <span style={checkedAtStyle}>checked {data.checked_at}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
        {data.teams.map((team) => (
          <li
            key={team.key}
            data-testid="stage-board-row"
            data-stage={team.stage}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: `3px solid ${STAGE_COLOUR[team.stage]}`,
              padding: '0.4rem 0.6rem',
              background: 'var(--tile-card-bg, rgba(0,0,0,0.25))',
              borderRadius: '2px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--tile-ink-hush, #6f879b)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{team.key}</span>
              <span style={{ fontWeight: 600, color: 'var(--tile-ink, #e6f7ff)' }}>{team.name}</span>
              <span data-testid="stage-board-word" style={{ fontWeight: 700, color: STAGE_COLOUR[team.stage], letterSpacing: '0.04em' }}>
                {team.stage}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.66rem', color: 'var(--tile-ink-hush, #6f879b)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                {STAGE_MAP.activeOrder
                  .slice()
                  .reverse()
                  .map((word) => `${word} ${team.counts[word]}`)
                  .join(' · ')}
                {team.capped ? ' · 1000+' : ''}
              </span>
            </div>
            <div style={{ marginTop: '0.2rem', color: 'var(--tile-ink-dim, #9bb0c1)', fontSize: '0.72rem' }}>
              {team.next ? (
                <>
                  Next:{' '}
                  {team.next.url ? (
                    <a href={team.next.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                      {team.next.identifier} {team.next.title}
                    </a>
                  ) : (
                    <>
                      {team.next.identifier} {team.next.title}
                    </>
                  )}
                </>
              ) : (
                'Next: nothing open'
              )}
              {team.unmapped.length > 0 && (
                <span style={{ color: 'var(--tile-amber-txt, #fb923c)' }}> · unmapped states: {team.unmapped.join(', ')}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

import type { BlockedLanesData } from './BlockedLanesTile'

export function BlockedLanesTile({ data }: { data: BlockedLanesData }) {
  if (data.read_error) {
    const localOnly = /ENOENT|no such file/i.test(data.read_error)
    return (
      <p
        data-testid="blocked-lanes-tile-error"
        style={{ color: localOnly ? 'var(--color-text-muted)' : 'var(--tile-amber-txt, #fb923c)', fontSize: '0.85rem', margin: 0 }}
      >
        {localOnly
          ? "Linear not connected (LINEAR_API_KEY not set) — and the local backlog fallback isn't available in this environment."
          : `Could not read backlog: ${data.read_error}`}
      </p>
    )
  }
  if (data.rows.length === 0) {
    return (
      <p
        data-testid="blocked-lanes-tile-empty"
        style={{ color: 'var(--tile-green-txt, #34d399)', fontSize: '0.85rem', margin: 0 }}
      >
        No blocked or gated lanes — {data.total_lanes} lanes total, all autonomous or done.
      </p>
    )
  }

  return (
    <div data-testid="blocked-lanes-tile">
      <div
        style={{
          color: 'var(--tile-amber-txt, #fb923c)',
          fontSize: '0.72rem',
          marginBottom: '0.3rem',
        }}
      >
        {data.blocked_count} of {data.total_lanes} lanes need Phill action
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
        {data.rows.map((r) => (
          <li
            key={`${r.number}-${r.name}`}
            style={{
              border: '1px solid rgba(251, 146, 60, 0.25)',
              borderLeft: '3px solid #fb923c',
              padding: '0.4rem 0.6rem',
              background: 'var(--tile-card-bg, rgba(0,0,0,0.25))',
              borderRadius: '2px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              {r.number !== null && (
                <span style={{ color: 'var(--tile-ink-hush, #6f879b)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                  #{r.number}
                </span>
              )}
              <span style={{ fontWeight: 600, color: 'var(--tile-ink, #e6f7ff)' }}>{r.name}</span>
              <span style={{ color: 'var(--tile-ink-dim, #9bb0c1)' }}>· {r.status}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.66rem',
                  color: 'var(--tile-ink-hush, #6f879b)',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
              >
                autonomous: {r.autonomous}
              </span>
            </div>
            {(r.next_action || r.required_authority) && (
              <div
                style={{
                  marginTop: '0.3rem',
                  color: 'var(--tile-ink-dim, #9bb0c1)',
                  fontSize: '0.72rem',
                }}
              >
                {r.next_action && <span>Next: {r.next_action}</span>}
                {r.next_action && r.required_authority && <span> · </span>}
                {r.required_authority && <span>Authority: {r.required_authority}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

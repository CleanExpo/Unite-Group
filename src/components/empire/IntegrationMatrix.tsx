// Pure presentational matrix for the integration mesh dashboard.
// Uses the empire design tokens (var(--ink-*), var(--surface-*), var(--green-400),
// var(--red-400), var(--orange-400)) to match existing empire components.

export interface SyncRow {
  integration: string;
  last_sync_completed_at: string | null;
  last_sync_status: string | null;
  rows_upserted: number | null;
  next_sync_due_at: string | null;
}

function statusColor(status: string | null): string {
  if (status === 'ok') return 'var(--green-400)';
  if (status === 'error') return 'var(--red-400)';
  if (status === 'partial') return 'var(--orange-400)';
  return 'var(--ink-tertiary)';
}

function fmtTs(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-tertiary)',
  padding: '10px 14px',
  borderBottom: '1px solid var(--border-hairline)',
};

const TD: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--ink-secondary)',
  padding: '10px 14px',
  borderBottom: '1px solid var(--border-hairline)',
};

export function IntegrationMatrix({ sync }: { sync: SyncRow[] }) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-secondary)',
          }}
        >
          Integration Matrix
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--ink-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sync.length} integrations
        </div>
      </div>

      {sync.length === 0 ? (
        <div
          style={{
            padding: '24px 18px',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
            textAlign: 'center',
          }}
        >
          No sync state recorded yet.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Integration</th>
              <th style={TH}>Status</th>
              <th style={TH}>Last Sync</th>
              <th style={{ ...TH, textAlign: 'right' }}>Rows</th>
              <th style={TH}>Next Due</th>
            </tr>
          </thead>
          <tbody>
            {sync.map((row) => (
              <tr key={row.integration}>
                <td
                  style={{
                    ...TD,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-primary)',
                    fontWeight: 600,
                  }}
                >
                  {row.integration}
                </td>
                <td style={TD}>
                  <span
                    style={{
                      color: statusColor(row.last_sync_status),
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                    }}
                  >
                    {row.last_sync_status ?? '—'}
                  </span>
                </td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>
                  {fmtTs(row.last_sync_completed_at)}
                </td>
                <td
                  style={{
                    ...TD,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-primary)',
                  }}
                >
                  {row.rows_upserted ?? '—'}
                </td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>
                  {fmtTs(row.next_sync_due_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

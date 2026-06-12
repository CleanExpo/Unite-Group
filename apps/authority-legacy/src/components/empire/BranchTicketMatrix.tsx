import type { BranchTicketLink } from '@/lib/developers/types';

// Pure presentational table. Empire tokens, no Tailwind.

const TABLE_WRAP: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

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

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

const EMPTY: React.CSSProperties = {
  padding: '24px 18px',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
  textAlign: 'center',
};

function fmtTs(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function shortRepo(repo: string): string {
  const parts = repo.split('/');
  return parts[parts.length - 1] ?? repo;
}

export function BranchTicketMatrix({ rows }: { rows: BranchTicketLink[] }) {
  if (rows.length === 0) {
    return <div style={{ ...TABLE_WRAP, ...EMPTY }}>No active branches.</div>;
  }

  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Repo</th>
            <th style={TH}>Branch</th>
            <th style={TH}>Linear</th>
            <th style={TH}>Status</th>
            <th style={TH}>Last Commit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.repo}@${r.branch}`}>
              <td style={{ ...TD, ...MONO, color: 'var(--ink-primary)' }}>
                {shortRepo(r.repo)}
              </td>
              <td style={{ ...TD, ...MONO }}>{r.branch}</td>
              <td style={TD}>
                {r.linearIssueId ? (
                  <a
                    href={`https://linear.app/unite-group/issue/${r.linearIssueId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...MONO,
                      color: 'var(--red-400)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {r.linearIssueId}
                  </a>
                ) : (
                  <span style={{ ...MONO, color: 'var(--ink-tertiary)' }}>—</span>
                )}
              </td>
              <td style={TD}>{r.linearStatus ?? '—'}</td>
              <td style={{ ...TD, ...MONO }}>{fmtTs(r.lastCommitAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

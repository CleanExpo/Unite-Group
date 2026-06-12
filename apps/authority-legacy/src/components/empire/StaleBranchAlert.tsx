import type { BranchTicketLink } from '@/lib/developers/types';

// Banner shown above the drilldown when branches haven't been pushed in 7+
// days. Returns null when there's nothing to alert on so a parent layout
// stays clean.

const BANNER: React.CSSProperties = {
  background: 'rgba(204, 26, 26, 0.10)',
  border: '1px solid rgba(204, 26, 26, 0.4)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 16px',
  color: 'var(--ink-primary)',
};

const TITLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--red-400)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const LIST: React.CSSProperties = {
  marginTop: 8,
  paddingLeft: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const ITEM: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink-secondary)',
};

function shortRepo(repo: string): string {
  const parts = repo.split('/');
  return parts[parts.length - 1] ?? repo;
}

function fmtDate(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export function StaleBranchAlert({
  branches,
}: {
  branches: BranchTicketLink[];
}) {
  if (branches.length === 0) return null;

  const noun = branches.length === 1 ? 'branch' : 'branches';

  return (
    <aside style={BANNER} role="alert">
      <div style={TITLE}>
        <span aria-hidden="true">▲</span>
        <span>
          {branches.length} stale {noun} · no push in 7+ days
        </span>
      </div>
      <ul style={LIST}>
        {branches.slice(0, 5).map((b) => (
          <li key={`${b.repo}@${b.branch}`} style={ITEM}>
            {shortRepo(b.repo)} · {b.branch} · last {fmtDate(b.lastCommitAt)}
          </li>
        ))}
        {branches.length > 5 && (
          <li style={{ ...ITEM, color: 'var(--ink-tertiary)' }}>
            +{branches.length - 5} more
          </li>
        )}
      </ul>
    </aside>
  );
}

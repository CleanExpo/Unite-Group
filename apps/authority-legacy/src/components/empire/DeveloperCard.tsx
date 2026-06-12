import Link from 'next/link';
import { ActivitySparkline } from './ActivitySparkline';
import type { DeveloperSnapshot } from '@/lib/developers/types';

// Pure presentational card. Uses empire CSS-var tokens (no Tailwind).
// Stale threshold mirrors the plan: > 72h since last push is highlighted.

const CARD: React.CSSProperties = {
  display: 'block',
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '16px 18px',
  textDecoration: 'none',
  color: 'var(--ink-primary)',
  transition: 'border-color 0.12s ease, background 0.12s ease',
};

const HEADER_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
};

const NAME: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '-0.2px',
  color: 'var(--ink-primary)',
};

const META: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const STAT_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 10,
  marginTop: 12,
};

const STAT_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-tertiary)',
  marginBottom: 2,
};

const STAT_VALUE: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '-0.3px',
};

const BADGE_ROW: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 12,
};

const BADGE_BASE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  padding: '3px 8px',
  borderRadius: 'var(--radius-md)',
  letterSpacing: '0.04em',
};

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div>
      <div style={STAT_LABEL}>{label}</div>
      <div style={{ ...STAT_VALUE, color: color ?? 'var(--ink-primary)' }}>{value}</div>
    </div>
  );
}

export function DeveloperCard({ snapshot }: { snapshot: DeveloperSnapshot }) {
  const {
    profile,
    sparkline,
    commitsToday,
    commitsThisWeek,
    openPRs,
    hoursSinceLastPush,
    prsBlockedOnReview,
    staleBranches,
  } = snapshot;

  const stale = hoursSinceLastPush !== null && hoursSinceLastPush > 72;

  const metaBits = [profile.role, profile.country, profile.timezone].filter(
    (x): x is string => Boolean(x),
  );

  return (
    <Link
      href={`/empire/developers/${encodeURIComponent(profile.primaryEmail)}`}
      style={CARD}
    >
      <header style={HEADER_ROW}>
        <h3 style={NAME}>{profile.displayName}</h3>
        <span style={META}>{metaBits.join(' · ') || '—'}</span>
      </header>

      <div style={{ marginTop: 12 }}>
        <ActivitySparkline data={sparkline} />
      </div>

      <dl style={STAT_GRID}>
        <Stat label="Today" value={commitsToday} />
        <Stat label="7d" value={commitsThisWeek} />
        <Stat label="Open PRs" value={openPRs.length} />
        <Stat
          label="Hrs since"
          value={hoursSinceLastPush ?? '—'}
          color={stale ? 'var(--red-400)' : undefined}
        />
      </dl>

      {(prsBlockedOnReview.length > 0 || staleBranches.length > 0) && (
        <div style={BADGE_ROW}>
          {prsBlockedOnReview.length > 0 && (
            <span
              style={{
                ...BADGE_BASE,
                background: 'rgba(224, 112, 32, 0.12)',
                color: 'var(--orange-400)',
                border: '1px solid rgba(224, 112, 32, 0.3)',
              }}
            >
              {prsBlockedOnReview.length} blocked on review
            </span>
          )}
          {staleBranches.length > 0 && (
            <span
              style={{
                ...BADGE_BASE,
                background: 'rgba(204, 26, 26, 0.12)',
                color: 'var(--red-400)',
                border: '1px solid rgba(204, 26, 26, 0.3)',
              }}
            >
              {staleBranches.length} stale branch
              {staleBranches.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

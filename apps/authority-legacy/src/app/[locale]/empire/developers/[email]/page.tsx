// Server component. Drilldown for a single developer. Calls
// getDeveloperState() directly — no fetch round-trip, no NEXTAUTH_URL.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActivitySparkline } from '@/components/empire/ActivitySparkline';
import { BranchTicketMatrix } from '@/components/empire/BranchTicketMatrix';
import { StaleBranchAlert } from '@/components/empire/StaleBranchAlert';
import {
  getDeveloperState,
  type DeveloperState,
} from '@/lib/developers/dashboard-state';

export const dynamic = 'force-dynamic';

const PAGE: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--canvas)',
  color: 'var(--ink-primary)',
  fontFamily: 'system-ui, sans-serif',
};

const HEADER: React.CSSProperties = {
  borderBottom: '1px solid var(--border-hairline)',
  padding: '14px 32px',
  background: 'var(--surface-1)',
};

const HEADER_INNER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 16,
  maxWidth: 1280,
  margin: '0 auto',
};

const HEADER_TITLE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: '-0.3px',
  color: 'var(--ink-primary)',
};

const HEADER_META: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-tertiary)',
  marginTop: 2,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em',
};

const BACK_LINK: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--red-400)',
  textDecoration: 'none',
  fontFamily: 'var(--font-mono)',
};

const MAIN: React.CSSProperties = {
  padding: '24px 32px',
  maxWidth: 1280,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const SECTION: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '16px 20px',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-tertiary)',
  marginBottom: 10,
};

const STAT_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
  marginTop: 12,
};

const STAT_CARD: React.CSSProperties = {
  background: 'var(--canvas)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
};

const STAT_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-tertiary)',
  marginBottom: 4,
};

const STAT_VALUE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink-primary)',
  letterSpacing: '-0.3px',
};

const TABLE_WRAP: React.CSSProperties = {
  background: 'var(--canvas)',
  border: '1px solid var(--border-hairline)',
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

const ERRORS_BLOCK: React.CSSProperties = {
  border: '1px solid rgba(224, 112, 32, 0.4)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 16px',
};

const ERRORS_TITLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--orange-400)',
  marginBottom: 6,
};

const ERRORS_LIST: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 11,
  color: 'var(--ink-secondary)',
  fontFamily: 'var(--font-mono)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
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
    <div style={STAT_CARD}>
      <div style={STAT_LABEL}>{label}</div>
      <div style={{ ...STAT_VALUE, color: color ?? 'var(--ink-primary)' }}>{value}</div>
    </div>
  );
}

function fmtTs(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function ciColor(state: string | null): string {
  if (state === 'success') return 'var(--green-400)';
  if (state === 'failure') return 'var(--red-400)';
  if (state === 'pending') return 'var(--orange-400)';
  return 'var(--ink-tertiary)';
}

export default async function DeveloperDrilldown({
  params,
}: {
  params: Promise<{ email: string; locale: string }>;
}) {
  const { email } = await params;
  const decoded = decodeURIComponent(email);
  const state: DeveloperState = await getDeveloperState(decoded);

  if (!state.developer) {
    notFound();
  }

  const dev = state.developer;
  const {
    profile,
    sparkline,
    perRepo,
    openPRs,
    prsBlockedOnReview,
    staleBranches,
    branchTicketMap,
    commitsToday,
    commitsThisWeek,
    commitsThisMonth,
    hoursSinceLastPush,
  } = dev;

  const metaBits = [
    profile.role,
    profile.country,
    profile.timezone,
    profile.hiredAt ? `hired ${profile.hiredAt}` : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <div style={PAGE}>
      <header style={HEADER}>
        <div style={HEADER_INNER}>
          <div>
            <div style={HEADER_TITLE}>{profile.displayName}</div>
            <div style={HEADER_META}>{metaBits.join(' · ') || '—'}</div>
          </div>
          <Link href="/empire/developers" style={BACK_LINK}>
            ← All developers
          </Link>
        </div>
      </header>

      <main style={MAIN}>
        <StaleBranchAlert branches={staleBranches} />

        <section style={SECTION}>
          <div style={SECTION_LABEL}>14-day activity</div>
          <ActivitySparkline data={sparkline} height={96} />
          <div style={STAT_GRID}>
            <Stat label="Today" value={commitsToday} />
            <Stat label="7d" value={commitsThisWeek} />
            <Stat label="30d" value={commitsThisMonth} />
            <Stat label="Open PRs" value={openPRs.length} />
            <Stat
              label="Blocked on review"
              value={prsBlockedOnReview.length}
              color={prsBlockedOnReview.length > 0 ? 'var(--orange-400)' : undefined}
            />
            <Stat
              label="Hrs since push"
              value={hoursSinceLastPush ?? '—'}
              color={
                hoursSinceLastPush !== null && hoursSinceLastPush > 72
                  ? 'var(--red-400)'
                  : undefined
              }
            />
          </div>
        </section>

        <section style={SECTION}>
          <div style={SECTION_LABEL}>Per-repo · last 30 days</div>
          {perRepo.length === 0 ? (
            <div style={{ ...TABLE_WRAP, ...EMPTY }}>No commits in window.</div>
          ) : (
            <div style={TABLE_WRAP}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Repo</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Commits</th>
                    <th style={TH}>Last commit</th>
                  </tr>
                </thead>
                <tbody>
                  {perRepo.map((r) => (
                    <tr key={r.repo}>
                      <td style={{ ...TD, ...MONO, color: 'var(--ink-primary)' }}>{r.repo}</td>
                      <td style={{ ...TD, ...MONO, textAlign: 'right', color: 'var(--ink-primary)' }}>
                        {r.commits14d}
                      </td>
                      <td style={{ ...TD, ...MONO }}>{fmtTs(r.lastCommitAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={SECTION}>
          <div style={SECTION_LABEL}>Open PRs</div>
          {openPRs.length === 0 ? (
            <div style={{ ...TABLE_WRAP, ...EMPTY }}>No open PRs.</div>
          ) : (
            <div style={TABLE_WRAP}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Repo</th>
                    <th style={TH}>#</th>
                    <th style={TH}>Title</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Days open</th>
                    <th style={TH}>CI</th>
                    <th style={TH}>Mergeable</th>
                  </tr>
                </thead>
                <tbody>
                  {openPRs.map((pr) => (
                    <tr key={pr.id}>
                      <td style={{ ...TD, ...MONO, color: 'var(--ink-primary)' }}>
                        {pr.repo.split('/').slice(-1)[0]}
                      </td>
                      <td style={{ ...TD, ...MONO }}>{pr.number}</td>
                      <td style={TD}>{pr.title}</td>
                      <td style={{ ...TD, ...MONO, textAlign: 'right' }}>{pr.daysOpen}</td>
                      <td style={{ ...TD, ...MONO, color: ciColor(pr.ciState), fontWeight: 600 }}>
                        {pr.ciState ?? '—'}
                      </td>
                      <td style={{ ...TD, ...MONO }}>{pr.mergeable ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={SECTION}>
          <div style={SECTION_LABEL}>Branch → ticket map</div>
          <BranchTicketMatrix rows={branchTicketMap} />
        </section>

        {state._errors && state._errors.length > 0 && (
          <div style={ERRORS_BLOCK}>
            <div style={ERRORS_TITLE}>Partial state — {state._errors.length} error(s)</div>
            <ul style={ERRORS_LIST}>
              {state._errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

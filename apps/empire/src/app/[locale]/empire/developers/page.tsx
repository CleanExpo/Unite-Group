// Server component. Calls getDevelopersState() directly (no fetch round-trip,
// no NEXTAUTH_URL dependency). Lives under [locale]/empire/ because
// src/app/empire/layout.tsx unconditionally redirects to /en/empire — the
// canonical path is /en/empire/developers.

import { DeveloperCard } from '@/components/empire/DeveloperCard';
import {
  getDevelopersState,
  type DevelopersState,
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

const HEADER_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const DOT: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--green-400)',
  display: 'inline-block',
  flexShrink: 0,
};

const TITLE: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.3px',
};

const SUBTITLE: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-tertiary)',
  marginTop: 1,
};

const MAIN: React.CSSProperties = {
  padding: '24px 32px',
  maxWidth: 1280,
  margin: '0 auto',
};

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 14,
};

const EMPTY_CARD: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '32px 24px',
  textAlign: 'center',
  color: 'var(--ink-tertiary)',
  fontSize: 13,
};

const ERRORS_BLOCK: React.CSSProperties = {
  marginTop: 20,
  background: 'var(--surface-1)',
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

export default async function DevelopersPage() {
  const state: DevelopersState = await getDevelopersState();

  return (
    <div style={PAGE}>
      <header style={HEADER}>
        <div style={HEADER_ROW}>
          <span style={DOT} />
          <div>
            <div style={TITLE}>Developers</div>
            <div style={SUBTITLE}>
              Activity, PR queue, branch → ticket mapping across the empire.
            </div>
          </div>
        </div>
      </header>

      <main style={MAIN}>
        {state.developers.length === 0 ? (
          <div style={EMPTY_CARD}>
            No developer profiles registered. Seed the{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>
              developer_profile
            </code>{' '}
            table to populate this view.
          </div>
        ) : (
          <section style={GRID}>
            {state.developers.map((dev) => (
              <DeveloperCard key={dev.profile.primaryEmail} snapshot={dev} />
            ))}
          </section>
        )}

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

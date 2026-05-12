import { IntegrationMatrix, type SyncRow } from '@/components/empire/IntegrationMatrix';

// Server component. Calls the unified read endpoint with the admin token header
// and renders the matrix + per-integration count sections.
//
// NOTE: A parent layout at src/app/empire/layout.tsx currently issues an
// unconditional redirect('/en/empire'), which means this page will not render
// at /empire/integrations without that layout being adjusted. Plan 2 Task 12
// explicitly pins this path; the layout fix is out-of-scope for this task.

export const dynamic = 'force-dynamic';

interface IntegrationsState {
  sync: SyncRow[];
  github: { repos: unknown[]; openPRs: unknown[] };
  vercel: { projects: unknown[] };
  railway: { services: unknown[] };
  digitalocean: { apps: unknown[] };
  supabase: { projects: unknown[] };
  onepassword: { index: unknown[] };
  linear: { openIssues: unknown[] };
  stripe: { mtd: unknown };
  composio: { connections: unknown[] };
}

async function fetchState(): Promise<IntegrationsState | { error: string }> {
  const base = process.env.NEXTAUTH_URL ?? '';
  const token = process.env.PI_CEO_API_KEY ?? '';
  if (!base || !token) {
    return { error: 'NEXTAUTH_URL or PI_CEO_API_KEY missing — cannot fetch integration state.' };
  }
  try {
    const res = await fetch(`${base}/api/empire/integrations`, {
      headers: { 'x-admin-token': token },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { error: `integrations endpoint ${res.status}` };
    }
    return (await res.json()) as IntegrationsState;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

const SECTION_CARD: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 18px',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-tertiary)',
  marginBottom: 6,
};

const SECTION_VALUE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink-primary)',
  letterSpacing: '-0.3px',
};

const SECTION_DETAIL: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-secondary)',
  marginTop: 4,
  fontFamily: 'var(--font-mono)',
};

function CountCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div style={SECTION_CARD}>
      <div style={SECTION_LABEL}>{label}</div>
      <div style={SECTION_VALUE}>{value}</div>
      {detail ? <div style={SECTION_DETAIL}>{detail}</div> : null}
    </div>
  );
}

export default async function IntegrationsPage() {
  const state = await fetchState();

  if ('error' in state) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--canvas)',
          color: 'var(--ink-primary)',
          padding: '24px 32px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.3px',
              color: 'var(--ink-primary)',
            }}
          >
            Integration Mesh
          </h1>
          <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>
            Per-integration health, sync state, and drift.
          </p>
        </header>
        <div
          style={{
            ...SECTION_CARD,
            color: 'var(--red-400)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          Error: {state.error}
        </div>
      </div>
    );
  }

  const mtdRecord = (state.stripe.mtd ?? null) as
    | { yyyymm?: string; invoice_count?: number; total_cents?: number }
    | null;
  const mtdDetail = mtdRecord
    ? `${mtdRecord.yyyymm ?? '—'} · ${mtdRecord.invoice_count ?? 0} invoices`
    : 'No invoices recorded';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border-hairline)',
          padding: '14px 32px',
          background: 'var(--surface-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--green-400)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>
              Integration Mesh
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 1 }}>
              Per-integration health, sync state, and drift.
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <IntegrationMatrix sync={state.sync} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <CountCard
            label="GitHub"
            value={state.github.repos.length}
            detail={`${state.github.openPRs.length} open PRs`}
          />
          <CountCard
            label="Vercel"
            value={state.vercel.projects.length}
            detail="projects"
          />
          <CountCard
            label="Railway"
            value={state.railway.services.length}
            detail="services"
          />
          <CountCard
            label="DigitalOcean"
            value={state.digitalocean.apps.length}
            detail="apps"
          />
          <CountCard
            label="Supabase"
            value={state.supabase.projects.length}
            detail="projects"
          />
          <CountCard
            label="1Password"
            value={state.onepassword.index.length}
            detail="indexed items (names only)"
          />
          <CountCard
            label="Linear"
            value={state.linear.openIssues.length}
            detail="open issues"
          />
          <CountCard
            label="Stripe MTD"
            value={
              mtdRecord && typeof mtdRecord.total_cents === 'number'
                ? `$${(mtdRecord.total_cents / 100).toFixed(2)}`
                : '—'
            }
            detail={mtdDetail}
          />
          <CountCard
            label="Composio"
            value={state.composio.connections.length}
            detail="connections"
          />
        </div>
      </main>
    </div>
  );
}

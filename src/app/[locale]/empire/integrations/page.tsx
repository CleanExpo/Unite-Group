import { IntegrationMatrix } from '@/components/empire/IntegrationMatrix';
import { PortfolioTile } from '@/components/empire/PortfolioTile';
import { getIntegrationsState, type IntegrationsState } from '@/lib/integrations/dashboard-state';

// Server component. Calls getIntegrationsState() directly (no fetch round-trip,
// no NEXTAUTH_URL dependency). Lives under [locale]/empire/ because
// src/app/empire/layout.tsx unconditionally redirects to /en/empire — the
// canonical path is /en/empire/integrations.

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const state: IntegrationsState = await getIntegrationsState();

  const mtdRecord = (state.stripe.mtd ?? null) as
    | { yyyymm?: string; invoice_count?: number; total_cents?: number }
    | null;
  const mtdDetail = mtdRecord
    ? `${mtdRecord.yyyymm ?? '—'} · ${mtdRecord.invoice_count ?? 0} invoices`
    : 'No invoices recorded';
  const stripeValue =
    mtdRecord && typeof mtdRecord.total_cents === 'number'
      ? `$${(mtdRecord.total_cents / 100).toFixed(2)}`
      : '—';

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
          <PortfolioTile
            title="GitHub"
            description={`${state.github.repos.length} repos · ${state.github.openPRs.length} open PRs`}
            status={state.github.repos.length > 0 ? 'operational' : 'degraded'}
            brandSlug="github"
          />
          <PortfolioTile
            title="Vercel"
            description={`${state.vercel.projects.length} projects`}
            status={state.vercel.projects.length > 0 ? 'operational' : 'degraded'}
            brandSlug="vercel"
          />
          <PortfolioTile
            title="Railway"
            description={`${state.railway.services.length} services`}
            status={state.railway.services.length > 0 ? 'operational' : 'degraded'}
            brandSlug="railway"
          />
          <PortfolioTile
            title="DigitalOcean"
            description={`${state.digitalocean.apps.length} apps`}
            status={state.digitalocean.apps.length > 0 ? 'operational' : 'degraded'}
            brandSlug="digitalocean"
          />
          <PortfolioTile
            title="Supabase"
            description={`${state.supabase.projects.length} projects`}
            status={state.supabase.projects.length > 0 ? 'operational' : 'degraded'}
            brandSlug="supabase"
          />
          <PortfolioTile
            title="1Password"
            description={`${state.onepassword.index.length} indexed items (names only)`}
            status={state.onepassword.index.length > 0 ? 'operational' : 'degraded'}
            brandSlug="onepassword"
          />
          <PortfolioTile
            title="Linear"
            description={`${state.linear.openIssues.length} open issues`}
            status="operational"
            brandSlug="linear"
          />
          <PortfolioTile
            title="Stripe MTD"
            description={`${stripeValue} · ${mtdDetail}`}
            status={mtdRecord ? 'operational' : 'degraded'}
            brandSlug="stripe"
          />
          <PortfolioTile
            title="Composio"
            description={`${state.composio.connections.length} connections`}
            status={state.composio.connections.length > 0 ? 'operational' : 'degraded'}
            brandSlug="composio"
          />
        </div>
      </main>
    </div>
  );
}

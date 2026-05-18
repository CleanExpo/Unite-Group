// /[locale]/empire/clients — index of every nexus_clients row.
//
// Founder-only. Server-rendered; reuses listNexusClients which
// normalizes brand_config. Each row links to /portal/<slug> and shows
// a brand-primary swatch + status pip.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkAdminSession } from '@/lib/security/require-admin';
import { listNexusClients } from '@/lib/empire/list-nexus-clients';
import { ActivateButton } from '@/components/empire/clients-edit/ActivateButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Clients · Empire Command Center',
};

const STATUS_TONES: Record<string, string> = {
  active: '#10b981',
  onboarding: '#f59e0b',
  paused: 'var(--ink-secondary, #94a3b8)',
  churned: '#f87171',
};

const STATUS_FILTERS = ['active', 'onboarding', 'paused', 'churned'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function parseStatusFilter(value: string | string[] | undefined): StatusFilter | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (STATUS_FILTERS as readonly string[]).includes(raw)) {
    return raw as StatusFilter;
  }
  return null;
}

export default async function EmpireClientsIndex({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { locale } = await params;
  const { status: statusParam } = await searchParams;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/empire/clients`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    redirect(`/${locale}/empire`);
  }

  const statusFilter = parseStatusFilter(statusParam);
  const result = await listNexusClients();
  const allClients = result?.clients ?? [];
  const clients = statusFilter
    ? allClients.filter((c) => c.status === statusFilter)
    : allClients;

  // Per-status counts off the unfiltered set so the strip stays stable.
  const counts: Record<StatusFilter, number> = {
    active: 0,
    onboarding: 0,
    paused: 0,
    churned: 0,
  };
  for (const c of allClients) {
    if (c.status in counts) counts[c.status as StatusFilter] += 1;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--canvas, #0a0a0a)',
        color: 'var(--ink-primary, #f5f5f5)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border-hairline, #1f1f23)',
          padding: '14px 32px',
          background: 'var(--surface-1, #18181b)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Link
          href={`/${locale}/empire`}
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-secondary, #94a3b8)',
            textDecoration: 'none',
          }}
        >
          ← Empire
        </Link>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Clients
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--ink-secondary, #94a3b8)',
          }}
        >
          {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          {statusFilter && (
            <>
              {' '}<span style={{ color: 'var(--ink-hush, #888)' }}>
                of {allClients.length}
              </span>
            </>
          )}
        </span>
        <Link
          href={`/${locale}/empire/clients/new`}
          style={{
            padding: '6px 12px',
            border: '1px solid var(--border-default, #27272a)',
            borderRadius: 6,
            background: 'var(--surface-1, #18181b)',
            color: 'var(--ink-primary, #f5f5f5)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            textDecoration: 'none',
          }}
        >
          + New
        </Link>
      </header>

      <main style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
        <nav
          aria-label="Filter by status"
          data-status-filter
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <FilterChip
            href={`/${locale}/empire/clients`}
            label={`All · ${allClients.length}`}
            active={statusFilter === null}
            tone="var(--ink-primary, #f5f5f5)"
          />
          {STATUS_FILTERS.map((s) => (
            <FilterChip
              key={s}
              href={`/${locale}/empire/clients?status=${s}`}
              label={`${s} · ${counts[s]}`}
              active={statusFilter === s}
              tone={STATUS_TONES[s]}
            />
          ))}
        </nav>

        {result === null && (
          <p
            role="alert"
            style={{
              padding: '10px 14px',
              borderLeft: '2px solid #f87171',
              color: '#f87171',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
            }}
          >
            Failed to read nexus_clients. Check Supabase logs.
          </p>
        )}

        {result !== null && clients.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--ink-secondary, #94a3b8)' }}>
            No clients onboarded yet. Click{' '}
            <Link
              href={`/${locale}/empire/clients/new`}
              style={{ color: 'var(--brand-primary, #D62828)' }}
            >
              + New
            </Link>{' '}
            to spin up the first one.
          </p>
        )}

        {clients.length > 0 && (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-default, #27272a)' }}>
                <th style={th}>Brand</th>
                <th style={th}>Company</th>
                <th style={th}>Slug</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={th}>Portal</th>
                <th style={th}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const primary = c.brand_config.primary_color ?? '#D62828';
                const statusTone = STATUS_TONES[c.status] ?? 'var(--ink-secondary, #94a3b8)';
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-hairline, #1f1f23)' }}>
                    <td style={td}>
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: primary,
                          verticalAlign: 'middle',
                        }}
                      />
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>{c.company_name}</td>
                    <td style={{ ...td, color: 'var(--ink-secondary, #94a3b8)' }}>{c.slug}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: statusTone, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                          {c.status}
                        </span>
                        {c.status === 'onboarding' && <ActivateButton slug={c.slug} />}
                      </div>
                    </td>
                    <td style={{ ...td, color: 'var(--ink-secondary, #94a3b8)' }}>
                      {formatDate(c.created_at)}
                    </td>
                    <td style={td}>
                      <Link
                        href={`/${locale}/portal/${c.slug}`}
                        style={{ color: 'var(--brand-primary, #D62828)', textDecoration: 'underline' }}
                      >
                        /portal/{c.slug} →
                      </Link>
                    </td>
                    <td style={td}>
                      <Link
                        href={`/${locale}/empire/clients/${c.slug}/edit`}
                        style={{ color: 'var(--ink-secondary, #94a3b8)', textDecoration: 'underline' }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--ink-secondary, #94a3b8)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontWeight: 500,
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--ink-primary, #f5f5f5)',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function FilterChip({
  href,
  label,
  active,
  tone,
}: {
  href: string;
  label: string;
  active: boolean;
  tone: string;
}) {
  return (
    <Link
      href={href}
      data-filter-active={active}
      style={{
        padding: '4px 10px',
        borderRadius: 4,
        border: `1px solid ${active ? tone : 'var(--border-default, #27272a)'}`,
        background: active ? 'var(--surface-1, #18181b)' : 'transparent',
        color: active ? tone : 'var(--ink-secondary, #94a3b8)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}

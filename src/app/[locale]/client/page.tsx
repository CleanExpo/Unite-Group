'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import type { PortalSummary } from '@/app/api/portal/summary/route';

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-client-md)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-tertiary)',
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--ink-primary)',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink-primary)',
          marginBottom: 12,
          letterSpacing: '-0.2px',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Placeholder card ─────────────────────────────────────────────────────────

function PlaceholderCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-client-md)',
        padding: '28px 24px',
        color: 'var(--ink-tertiary)',
        fontSize: 'var(--text-md)',
        fontStyle: 'italic',
      }}
    >
      {message}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestText, setRequestText] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/en/login');
        return;
      }
      fetch('/api/portal/summary')
        .then((r) => r.json())
        .then((d: PortalSummary) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    // Wave 2 will wire this to Linear/email. For now: optimistic confirm.
    setRequestSent(true);
    setRequestText('');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-tertiary)',
          fontSize: 13,
        }}
      >
        Loading your dashboard...
      </div>
    );
  }

  const d = data ?? {
    clientName: 'CCW-CRM',
    plan: 'Pro',
    arrAud: 33000,
    domain: null,
    websiteScore: 78,
    seoSnapshot: null,
    lastReportAt: null,
  };

  const planLabel = `${d.plan} ($${Math.round(d.arrAud / 1000)}k/yr AUD)`;
  const scoreLabel = d.websiteScore !== null ? `${d.websiteScore}/100` : '—';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Welcome banner */}
      <div
        style={{
          borderLeft: '3px solid var(--red-500)',
          paddingLeft: 16,
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            letterSpacing: '-0.4px',
            marginBottom: 4,
          }}
        >
          Welcome back. Here&apos;s your agency report for{' '}
          <span style={{ color: 'var(--red-400)' }}>{d.clientName}</span>.
        </h1>
        {d.domain && (
          <div style={{ fontSize: 'var(--text-md)', color: 'var(--ink-secondary)' }}>
            Tracking: {d.domain}
          </div>
        )}
      </div>

      {/* KPI metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Website Health"
          value={scoreLabel}
          sub="Last audit running"
        />
        <MetricCard
          label="Avg SEO Position"
          value="N/A"
          sub="Audit in progress"
        />
        <MetricCard
          label="Content Published"
          value="0"
          sub="This month"
        />
        <MetricCard
          label="Plan"
          value={d.plan}
          sub={planLabel}
        />
      </div>

      {/* SEO Rankings */}
      <Section title="SEO Rankings">
        <PlaceholderCard message="No data yet. First audit running." />
      </Section>

      {/* Content Pipeline */}
      <Section title="Content Pipeline">
        <PlaceholderCard message="Content generation active. First batch arriving soon." />
      </Section>

      {/* Request a Change */}
      <Section title="Request a Change">
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-client-md)',
            padding: '24px',
          }}
        >
          {requestSent ? (
            <div
              style={{
                fontSize: 'var(--text-md)',
                color: 'var(--color-success-text)',
              }}
            >
              Request received. Your account manager will follow up within 1 business day.
            </div>
          ) : (
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--ink-secondary)',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                Describe the change or question
              </label>
              <textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                rows={4}
                placeholder="e.g. Can you update our service area to include Gold Coast?"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 'var(--text-md)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-client-md)',
                  color: 'var(--ink-primary)',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: 'var(--leading-normal)',
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = 'var(--red-500)')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = 'var(--border-default)')
                }
              />
              <div>
                <button
                  type="submit"
                  disabled={!requestText.trim()}
                  style={{
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    background: requestText.trim()
                      ? 'var(--red-500)'
                      : 'var(--surface-3)',
                    color: requestText.trim()
                      ? '#fff'
                      : 'var(--ink-disabled)',
                    border: 'none',
                    borderRadius: 'var(--radius-client-md)',
                    cursor: requestText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background var(--duration-base)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Send Request
                </button>
              </div>
            </form>
          )}
        </div>
      </Section>
    </div>
  );
}

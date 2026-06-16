'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  // Preserve the active locale on the unauth bounce — a /fr/ visitor should
  // land back on /fr/login, not get dropped to /en/.
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';
  const [data, setData] = useState<PortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestText, setRequestText] = useState('');
  const [requestStatus, setRequestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [seoRefreshing, setSeoRefreshing] = useState(false);
  const [artefacts, setArtefacts] = useState<Array<{
    filename: string; title: string; type: string; preview: string; date: string;
  }>>([]);
  const [pipelineActivity, setPipelineActivity] = useState<Array<{ label: string; when: string }>>([]);

  const fetchSummary = () =>
    fetch('/api/portal/summary')
      .then((r) => r.json())
      .then((d: PortalSummary) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }
      fetchSummary();
      fetch('/api/portal/artefacts?client=ccw')
        .then(r => r.json())
        .then(d => setArtefacts(d.artefacts ?? []))
        .catch(() => {});
      fetch('/api/empire/pipeline')
        .then(r => r.json())
        .then(d => setPipelineActivity(d.recent_activity ?? []))
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim() || requestPending) return;
    setRequestPending(true);
    setRequestStatus(null);
    try {
      const res = await fetch('/api/portal/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: requestText }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRequestStatus({ ok: true, msg: `✓ Request submitted — ticket ${json.ticketId} created. We'll be in touch within 24 hours.` });
        setRequestText('');
      } else {
        setRequestStatus({ ok: false, msg: json.error ?? 'Something went wrong. Please try again.' });
      }
    } catch {
      setRequestStatus({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setRequestPending(false);
    }
  };

  const handleSeoRefresh = async () => {
    setSeoRefreshing(true);
    try {
      await fetch('/api/portal/seo-refresh', { method: 'POST' });
      await fetchSummary();
    } catch {
      // silent — summary fetch already handles errors
    } finally {
      setSeoRefreshing(false);
    }
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
  const seoData = d.seoSnapshot as {
    metrics: { organicTraffic: number; totalKeywords: number };
    topKeywords: { keyword: string; position: number | null; volume: number }[];
  } | null;

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
          label="Keywords Tracked"
          value={seoData?.metrics?.totalKeywords ? seoData.metrics.totalKeywords.toLocaleString() : 'N/A'}
          sub={seoData ? 'From last audit' : 'Audit not yet run'}
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
        {seoData ? (
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-client-md)',
              overflow: 'hidden',
            }}
          >
            {seoData.metrics?.organicTraffic > 0 && (
              <div
                style={{
                  padding: '12px 20px',
                  fontSize: 12,
                  color: 'var(--ink-secondary)',
                  borderBottom: '1px solid var(--border-hairline)',
                }}
              >
                ~{seoData.metrics.organicTraffic.toLocaleString()} visits/mo estimated
              </div>
            )}
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 100px',
                padding: '8px 20px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-tertiary)',
                borderBottom: '1px solid var(--border-hairline)',
              }}
            >
              <span>Keyword</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Position</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Volume</span>
            </div>
            {seoData.topKeywords.map(
              (kw: { keyword: string; position: number | null; volume: number }, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px',
                    padding: '10px 20px',
                    fontSize: 13,
                    color: 'var(--ink-primary)',
                    borderBottom:
                      i < seoData.topKeywords.length - 1
                        ? '1px solid var(--border-hairline)'
                        : undefined,
                  }}
                >
                  <span>{kw.keyword}</span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    {kw.position ?? '—'}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    {kw.volume ? kw.volume.toLocaleString() : '—'}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-client-md)',
              padding: '28px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <span
              style={{
                color: 'var(--ink-tertiary)',
                fontSize: 'var(--text-md)',
                fontStyle: 'italic',
              }}
            >
              No data yet. Run the first audit to populate rankings.
            </span>
            <button
              onClick={handleSeoRefresh}
              disabled={seoRefreshing}
              style={{
                padding: '8px 18px',
                fontSize: 12,
                fontWeight: 600,
                background: seoRefreshing ? 'var(--surface-3)' : 'var(--red-500)',
                color: seoRefreshing ? 'var(--ink-disabled)' : '#fff',
                border: 'none',
                borderRadius: 'var(--radius-client-md)',
                cursor: seoRefreshing ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {seoRefreshing ? 'Running…' : 'Run first audit'}
            </button>
          </div>
        )}
      </Section>

      {/* Content & Strategy — harness artefacts */}
      <Section title="Content &amp; Strategy">
        <section style={{ marginTop: 0 }}>
          <div style={{
            fontSize: 'var(--text-2xs)', fontWeight: 600,
            letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase',
            color: 'var(--ink-tertiary)', marginBottom: 12,
          }}>CONTENT &amp; STRATEGY</div>

          {artefacts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {artefacts.map(a => (
                <div key={a.filename} style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-client-md)',
                  padding: '12px 14px',
                }}>
                  {/* Type badge */}
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 'var(--tracking-caps)',
                    textTransform: 'uppercase', color: 'var(--red-400)',
                    fontFamily: 'var(--font-mono)', marginBottom: 6,
                  }}>
                    {a.type.replace(/-/g, ' ')}
                  </div>
                  {/* Title */}
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)',
                    marginBottom: 6, lineHeight: 1.3,
                  }}>
                    {a.title}
                  </div>
                  {/* Preview */}
                  <div style={{
                    fontSize: 12, color: 'var(--ink-tertiary)',
                    lineHeight: 1.5, overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {a.preview}
                  </div>
                  {/* Date */}
                  <div style={{
                    fontSize: 10, color: 'var(--ink-disabled)',
                    fontFamily: 'var(--font-mono)', marginTop: 8,
                  }}>
                    {a.date}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: 'var(--surface-1)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-client-md)', padding: 20,
              color: 'var(--ink-tertiary)', fontSize: 13, textAlign: 'center',
            }}>
              Strategy documents are being prepared for your account.
            </div>
          )}
        </section>
      </Section>

      {/* Autonomous Pipeline Activity */}
      <Section title="What We're Working On">
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-client-md)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--green-400)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-secondary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}>
              Autonomous pipeline — live
            </span>
          </div>

          {/* Pipeline stages */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            gap: 0,
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            {['Margot', 'Board', 'PM', 'Build', 'Deployed'].map((stage, i) => (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: i === 4 ? 'rgba(0,168,84,0.1)' : 'var(--surface-2)',
                    border: `1px solid ${i === 4 ? 'rgba(0,168,84,0.3)' : 'var(--border-hairline)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: i === 4 ? 'var(--green-400)' : 'var(--ink-tertiary)',
                  }}>
                    {i === 4 ? '✓' : '—'}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: 'var(--ink-tertiary)',
                    textAlign: 'center',
                    letterSpacing: '0.04em',
                  }}>
                    {stage}
                  </div>
                </div>
                {i < 4 && (
                  <div style={{
                    width: 20,
                    textAlign: 'center',
                    color: 'var(--border-default)',
                    fontSize: 10,
                    flexShrink: 0,
                    paddingBottom: 14,
                  }}>→</div>
                )}
              </div>
            ))}
          </div>

          {/* Recent activity feed */}
          <div style={{ padding: '12px 20px' }}>
            {pipelineActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pipelineActivity.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 12,
                  }}>
                    <span style={{
                      color: 'var(--ink-disabled)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      flexShrink: 0,
                      paddingTop: 2,
                    }}>
                      {item.when}
                    </span>
                    <span style={{ color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: 12,
                color: 'var(--ink-tertiary)',
                fontStyle: 'italic',
              }}>
                The autonomous pipeline is running on your account. Activity appears here as work completes.
              </div>
            )}
          </div>
        </div>
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
          {requestStatus && (
            <div
              style={{
                fontSize: 'var(--text-md)',
                color: requestStatus.ok ? 'var(--color-success-text)' : 'var(--color-error-text)',
                marginBottom: requestStatus.ok ? 0 : 12,
              }}
            >
              {requestStatus.msg}
            </div>
          )}
          {!requestStatus?.ok && (
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
                  disabled={!requestText.trim() || requestPending}
                  style={{
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    background: requestText.trim() && !requestPending
                      ? 'var(--red-500)'
                      : 'var(--surface-3)',
                    color: requestText.trim() && !requestPending
                      ? '#fff'
                      : 'var(--ink-disabled)',
                    border: 'none',
                    borderRadius: 'var(--radius-client-md)',
                    cursor: requestText.trim() && !requestPending ? 'pointer' : 'not-allowed',
                    transition: 'background var(--duration-base)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {requestPending ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Section>
    </div>
  );
}

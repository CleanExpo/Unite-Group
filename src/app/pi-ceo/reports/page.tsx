'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase/client';
import { RefreshMark, ReportsMark, ChevronDownMark, ChevronUpMark, DownloadMark, CalendarMark } from '@/components/ui/marks';

interface SEOReport {
  id: string;
  domain?: string;
  report_type?: string;
  content?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

function extractScore(report: SEOReport): number | null {
  // Try direct score field (legacy), then metadata
  const direct = (report as unknown as Record<string, unknown>).score;
  if (typeof direct === 'number') return direct;
  if (report.metadata) {
    const meta = report.metadata as Record<string, unknown>;
    if (typeof meta.score === 'number') return meta.score;
    if (typeof meta.overall_score === 'number') return meta.overall_score;
    if (typeof meta.seo_score === 'number') return meta.seo_score;
  }
  return null;
}

function extractKeywords(report: SEOReport): number | null {
  if (report.metadata) {
    const meta = report.metadata as Record<string, unknown>;
    if (typeof meta.keywords_count === 'number') return meta.keywords_count;
    if (typeof meta.total_keywords === 'number') return meta.total_keywords;
    if (Array.isArray(meta.keywords)) return (meta.keywords as unknown[]).length;
  }
  return null;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--ink-tertiary)';
  if (score >= 80) return 'var(--green-400)';
  if (score >= 60) return 'var(--orange-400)';
  return 'var(--red-500)';
}

function scoreBg(score: number | null): string {
  if (score === null) return 'var(--surface-2)';
  if (score >= 80) return 'color-mix(in srgb, var(--green-400) 12%, transparent)';
  if (score >= 60) return 'color-mix(in srgb, var(--orange-400) 12%, transparent)';
  return 'color-mix(in srgb, var(--red-500) 12%, transparent)';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SEOReport[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }

      supabaseClient
        .from('pi_ceo_seo_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setReports(data || []);
          setLoading(false);
        });
    });
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshMark size={18} color="var(--ink-tertiary)" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--ink-primary)', padding: '32px 32px 64px' }}>

      {/* Back link */}
      <Link href="/en/empire" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-tertiary)', textDecoration: 'none', marginBottom: 24 }}>
        ← Command Center
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'color-mix(in srgb, var(--red-500) 10%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ReportsMark size={18} color="var(--red-500)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
              SEO Reports
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{reports.length}</span>
              {' '}SEO audit reports — archived intelligence
            </p>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-tertiary)' }}>
          <ReportsMark size={40} color="var(--ink-tertiary)" />
          <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--ink-secondary)' }}>No reports generated yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(report => {
            const isExpanded = expanded === report.id;
            const score = extractScore(report);
            const keywords = extractKeywords(report);
            const color = scoreColor(score);

            return (
              <div
                key={report.id}
                style={{
                  background: 'var(--surface-1)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  borderLeft: `3px solid ${score !== null ? color : 'var(--border-default)'}`,
                }}
              >
                {/* Card header */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Domain */}
                      <div style={{
                        fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)',
                        marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {report.domain || 'Unknown domain'}
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {report.report_type && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: 'var(--ink-secondary)',
                            background: 'var(--surface-2)', padding: '2px 8px',
                            borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.07em',
                            border: '1px solid var(--border-default)',
                          }}>
                            {report.report_type}
                          </span>
                        )}
                        {keywords !== null && (
                          <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            {keywords.toLocaleString()} keywords
                          </span>
                        )}
                        {report.created_at && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            <CalendarMark size={10} color="var(--ink-tertiary)" />
                            {formatDate(report.created_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score badge */}
                    {score !== null && (
                      <div style={{
                        textAlign: 'center', flexShrink: 0,
                        padding: '8px 14px', borderRadius: 6,
                        background: scoreBg(score),
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                          {Math.round(score)}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
                          score
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    {report.domain && (
                      <a
                        href={`/api/seo/audit/pdf?domain=${encodeURIComponent(report.domain)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500,
                          color: 'var(--ink-secondary)', background: 'var(--surface-2)',
                          border: '1px solid var(--border-default)',
                          padding: '5px 12px', borderRadius: 6, textDecoration: 'none',
                        }}
                      >
                        <DownloadMark size={11} color="var(--ink-tertiary)" />
                        PDF
                      </a>
                    )}
                    {report.content && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : report.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500,
                          color: 'var(--ink-secondary)', background: 'transparent',
                          border: '1px solid var(--border-default)',
                          padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? <ChevronUpMark size={11} /> : <ChevronDownMark size={11} />}
                        {isExpanded ? 'Collapse' : 'View report'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable content */}
                {isExpanded && report.content && (
                  <div style={{
                    padding: '0 20px 20px',
                    borderTop: '1px solid var(--border-default)',
                    paddingTop: 16,
                  }}>
                    <pre style={{
                      margin: 0, fontSize: 11, color: 'var(--ink-secondary)',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: 360, overflowY: 'auto',
                      background: 'var(--canvas)', padding: '14px 16px',
                      borderRadius: 6, border: '1px solid var(--border-default)',
                      fontFamily: 'var(--font-mono)', lineHeight: 1.65,
                    }}>
                      {report.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

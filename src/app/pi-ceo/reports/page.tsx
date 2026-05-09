'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { RefreshMark, ReportsMark, ChevronDownMark, ChevronUpMark, DownloadMark } from '@/components/ui/marks';

interface SEOReport {
  id: string;
  domain?: string;
  report_type?: string;
  score?: number;
  keywords_count?: number;
  created_at?: string;
  content?: string;
}

function scoreColor(score?: number) {
  if (!score) return '#52525b';
  if (score >= 80) return '#16a34a';
  if (score >= 60) return 'var(--orange-400)';
  return '#dc2626';
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
        <RefreshMark size={18} color="#334155" className="spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--ink-primary)', padding: '32px 32px 64px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReportsMark size={18} color="#818cf8" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>SEO Reports</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#71717a', marginTop: 2 }}>Archive of all generated SEO audit reports</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <ReportsMark size={40} color="var(--ink-tertiary)" className="mb-4" />
          <p style={{ margin: 0, fontSize: 15, color: '#71717a' }}>No reports generated yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {reports.map(report => {
            const isExpanded = expanded === report.id;
            const color = scoreColor(report.score);
            return (
              <div key={report.id} style={{ background: 'var(--surface-1)', border: '1px solid #1f1f23', borderRadius: 12, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.domain || 'Unknown domain'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {report.report_type && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.12)', padding: '2px 7px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {report.report_type}
                          </span>
                        )}
                        {report.keywords_count != null && (
                          <span style={{ fontSize: 11, color: '#71717a' }}>
                            {report.keywords_count} keywords
                          </span>
                        )}
                        {report.created_at && (
                          <span style={{ fontSize: 11, color: '#52525b' }}>
                            {new Date(report.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {report.score != null && (
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(report.score)}</div>
                        <div style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Score</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                    {report.domain && (
                      <a
                        href={`/api/seo/audit/pdf?domain=${encodeURIComponent(report.domain)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500,
                          color: 'var(--ink-secondary)', background: '#1a1a1e', border: '1px solid #27272a',
                          padding: '6px 12px', borderRadius: 7, textDecoration: 'none', transition: 'all 0.1s ease',
                        }}
                      >
                        <DownloadMark size={12} />
                        PDF
                      </a>
                    )}
                    {report.content && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : report.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500,
                          color: 'var(--ink-secondary)', background: 'transparent', border: '1px solid #27272a',
                          padding: '6px 12px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.1s ease',
                        }}
                      >
                        {isExpanded ? <ChevronUpMark size={12} /> : <ChevronDownMark size={12} />}
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable content */}
                {isExpanded && report.content && (
                  <div style={{ padding: '0 20px 18px', borderTop: '1px solid #1f1f23', paddingTop: 16 }}>
                    <pre style={{
                      margin: 0, fontSize: 11, color: '#71717a', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto',
                      background: '#0c0c0e', padding: '12px', borderRadius: 8,
                      fontFamily: 'monospace', lineHeight: 1.6,
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

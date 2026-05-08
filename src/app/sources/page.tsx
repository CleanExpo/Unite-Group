'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { RefreshCw, Rss, CheckCircle2, Clock } from 'lucide-react';

interface WikiSource {
  id: string;
  filename?: string;
  title?: string;
  status: string;
  processed_at?: string;
  created_at?: string;
  wiki_pages_updated?: string[];
}

interface SourcesData {
  pending: WikiSource[];
  completed: WikiSource[];
}

export default function SourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SourcesData>({ pending: [], completed: [] });

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      fetch('/api/sources')
        .then(r => r.json())
        .then((d: SourcesData) => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={18} color="#334155" className="spin" />
      </div>
    );
  }

  const isEmpty = data.pending.length === 0 && data.completed.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#fafafa', padding: '32px 32px 64px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Rss size={18} color="#a78bfa" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Sources Pipeline</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#71717a', marginTop: 2 }}>Obsidian ingestion — files pending and processed</p>
        </div>
      </div>

      {isEmpty ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#52525b' }}>
          <CheckCircle2 size={40} color="#3f3f46" style={{ marginBottom: 16 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#71717a' }}>All sources processed — 2nd Brain is up to date</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Pending */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={14} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pending</span>
              {data.pending.length > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>
                  {data.pending.length}
                </span>
              )}
            </div>
            {data.pending.length === 0 ? (
              <div style={{ padding: '20px 16px', background: '#111113', border: '1px solid #27272a', borderRadius: 10, color: '#52525b', fontSize: 13 }}>
                No pending sources
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.pending.map(source => (
                  <div key={source.id} style={{ padding: '14px 16px', background: '#111113', border: '1px solid #27272a', borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fafafa', marginBottom: 4 }}>
                      {source.title || source.filename || 'Untitled'}
                    </div>
                    {source.filename && source.title && (
                      <div style={{ fontSize: 11, color: '#52525b', fontFamily: 'monospace' }}>{source.filename}</div>
                    )}
                    {source.created_at && (
                      <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 6 }}>
                        Queued {new Date(source.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Completed</span>
              {data.completed.length > 0 && (
                <span style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>
                  {data.completed.length}
                </span>
              )}
            </div>
            {data.completed.length === 0 ? (
              <div style={{ padding: '20px 16px', background: '#111113', border: '1px solid #27272a', borderRadius: 10, color: '#52525b', fontSize: 13 }}>
                No completed sources yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.completed.map(source => (
                  <div key={source.id} style={{ padding: '14px 16px', background: '#111113', border: '1px solid #27272a', borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fafafa', marginBottom: 4 }}>
                      {source.title || source.filename || 'Untitled'}
                    </div>
                    {source.wiki_pages_updated && source.wiki_pages_updated.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {source.wiki_pages_updated.map((page, i) => (
                          <span key={i} style={{ fontSize: 10, fontWeight: 500, color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 12 }}>
                            {page}
                          </span>
                        ))}
                      </div>
                    )}
                    {source.processed_at && (
                      <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 6 }}>
                        Processed {new Date(source.processed_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

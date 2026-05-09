'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { RefreshCw, Activity } from 'lucide-react';

interface ActivityRecord {
  id: string;
  project_id?: string;
  action_type?: string;
  title?: string;
  detail?: string;
  created_at?: string;
}

const ACTION_EMOJI: Record<string, string> = {
  poll:      '🔍',
  ticket:    '🎫',
  deploy:    '🔧',
  seo:       '📊',
  security:  '🔒',
  overnight: '🌙',
};

function getEmoji(type?: string) {
  if (!type) return '⚡';
  const key = Object.keys(ACTION_EMOJI).find(k => type.toLowerCase().includes(k));
  return key ? ACTION_EMOJI[key] : '⚡';
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [allRecords, setAllRecords] = useState<ActivityRecord[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      supabaseClient
        .from('pi_ceo_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          const rows = data || [];
          setAllRecords(rows);
          setRecords(rows);
          const uniqueProjects = Array.from(new Set(rows.map((r: ActivityRecord) => r.project_id).filter(Boolean))) as string[];
          setProjects(uniqueProjects);
          setLoading(false);
        });
    });
  }, [router]);

  useEffect(() => {
    if (projectFilter === 'all') {
      setRecords(allRecords);
    } else {
      setRecords(allRecords.filter(r => r.project_id === projectFilter));
    }
  }, [projectFilter, allRecords]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={18} color="#334155" className="spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--ink-primary)', padding: '32px 32px 64px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={18} color="#60a5fa" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Pi-CEO Activity Log</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#71717a', marginTop: 2 }}>All autonomous agent actions across the portfolio</p>
          </div>
        </div>

        {/* Project filter */}
        {projects.length > 0 && (
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{
              background: 'var(--surface-1)', border: '1px solid #27272a', color: 'var(--ink-secondary)',
              fontSize: 13, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="all">All projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      {records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#52525b' }}>
          <Activity size={40} color="var(--ink-tertiary)" style={{ marginBottom: 16 }} />
          <p style={{ margin: 0, fontSize: 15, color: '#71717a' }}>No activity recorded yet</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 1, background: 'var(--border-default)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {records.map((rec, i) => (
              <div key={rec.id || i} style={{ position: 'relative', padding: '12px 16px', background: 'var(--surface-1)', border: '1px solid #1f1f23', borderRadius: 10, marginBottom: 4 }}>
                {/* Dot on timeline */}
                <div style={{ position: 'absolute', left: -22, top: 16, width: 8, height: 8, borderRadius: '50%', background: '#334155', border: '2px solid #1f2937' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{getEmoji(rec.action_type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {rec.project_id && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.12)', padding: '2px 7px', borderRadius: 12, letterSpacing: '0.04em' }}>
                          {rec.project_id}
                        </span>
                      )}
                      {rec.action_type && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {rec.action_type}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginLeft: 'auto' }}>{timeAgo(rec.created_at)}</span>
                    </div>
                    {rec.title && (
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-primary)', marginTop: 4 }}>{rec.title}</div>
                    )}
                    {rec.detail && (
                      <div style={{ fontSize: 12, color: '#71717a', marginTop: 3, lineHeight: 1.5 }}>{rec.detail}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

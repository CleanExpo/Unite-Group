'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { RefreshMark, BarChartMark } from '@/components/ui/marks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface HealthSnapshot {
  id: string;
  project_id: string;
  overall_health: number;
  created_at?: string;
}

interface BusinessHealth {
  name: string;
  snapshots: { date: string; score: number }[];
  current: number;
}

const BUSINESSES = ['restoreassist', 'synthex', 'ccw-crm', 'dr-platform', 'nrpg', 'carsi'];
const BIZ_LABELS: Record<string, string> = {
  'restoreassist': 'RestoreAssist',
  'synthex':       'Synthex',
  'ccw-crm':       'CCW',
  'dr-platform':   'DR Platform',
  'nrpg':          'NRPG',
  'carsi':         'CARSI',
};

function scoreColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return 'var(--orange-400)';
  return '#dc2626';
}

function scoreBg(score: number) {
  if (score >= 80) return 'rgba(22,163,74,0.12)';
  if (score >= 60) return 'rgba(245,158,11,0.12)';
  return 'rgba(220,38,38,0.12)';
}

export default function HealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessHealth[]>([]);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }

      supabaseClient
        .from('pi_ceo_health_snapshots')
        .select('*')
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          const rows: HealthSnapshot[] = data || [];

          const grouped = BUSINESSES.map(bizId => {
            const bizSnaps = rows.filter(r => r.project_id === bizId);
            const snapshots = bizSnaps.map(r => ({
              date: r.created_at
                ? new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                : '',
              score: r.overall_health ?? 0,
            }));
            const current = snapshots.length > 0 ? snapshots[snapshots.length - 1].score : 0;
            return { name: BIZ_LABELS[bizId] || bizId, snapshots, current };
          });

          setBusinesses(grouped);
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
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChartMark size={18} color="#4ade80" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Health History</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#71717a', marginTop: 2 }}>Portfolio health scores over time</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {businesses.map(biz => {
          const color = scoreColor(biz.current);
          const bg = scoreBg(biz.current);
          return (
            <div key={biz.name} style={{ background: 'var(--surface-1)', border: '1px solid #1f1f23', borderRadius: 12, padding: '20px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>{biz.name}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color,
                  background: bg, padding: '3px 10px', borderRadius: 20,
                }}>
                  {biz.current > 0 ? `${Math.round(biz.current)}` : '—'}
                </span>
              </div>

              {biz.snapshots.length < 2 ? (
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-tertiary)', fontSize: 12 }}>
                  Not enough data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={biz.snapshots} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <defs>
                      <linearGradient id={`grad-${biz.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-1)', border: '1px solid #27272a', borderRadius: 6, fontSize: 12, color: 'var(--ink-primary)' }}
                      itemStyle={{ color }}
                      formatter={(val: number) => [`${Math.round(val)}`, 'Health']}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#grad-${biz.name})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

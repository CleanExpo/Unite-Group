'use client';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { StatusDot } from './StatusDot';

interface BusinessCardProps {
  name: string;
  status: 'operational' | 'building' | 'degraded' | 'down';
  descriptor: string;
  stat1: string;
  stat2: string;
  uptime_pct?: number;
  open_prs?: number;
  ci_passing?: boolean | null;
  trend?: number[];  // 7 values for sparkline
  arr_aud?: number;
}

const STATUS_COLORS = {
  operational: '#10b981',
  building: '#3b82f6',
  degraded: '#f59e0b',
  down: '#ef4444',
};

const BORDER_CLASSES = {
  operational: 'border-emerald-900/50 hover:border-emerald-700/50',
  building: 'border-blue-900/50 hover:border-blue-700/50',
  degraded: 'border-amber-900/50 hover:border-amber-700/50',
  down: 'border-red-900/50 hover:border-red-700/50',
};

function CiBadge({ ci_passing }: { ci_passing?: boolean | null }) {
  if (ci_passing === true) {
    return <span className="text-xs text-emerald-400 font-mono">✓ CI</span>;
  }
  if (ci_passing === false) {
    return <span className="text-xs text-amber-400 font-mono">⚠ CI</span>;
  }
  return <span className="text-xs text-slate-600 font-mono">— CI</span>;
}

export function BusinessCard({
  name,
  status,
  descriptor,
  stat1,
  stat2,
  uptime_pct,
  open_prs,
  ci_passing,
  trend,
  arr_aud,
}: BusinessCardProps) {
  const sparkData = trend?.map((v) => ({ v }));
  const strokeColor = STATUS_COLORS[status];

  return (
    <div
      className={`bg-slate-900/80 backdrop-blur-sm border rounded-lg p-4 transition-colors duration-200 ${BORDER_CLASSES[status]}`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <StatusDot status={status} size="sm" pulse />
          <span className="text-sm font-semibold text-slate-100">{name}</span>
        </div>
        <CiBadge ci_passing={ci_passing} />
      </div>

      {/* Descriptor */}
      <p className="text-xs text-slate-400 mb-3">{descriptor}</p>

      {/* Sparkline */}
      {sparkData && sparkData.length > 0 && (
        <div className="h-9 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#grad-${name})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{stat1}</span>
          <span className="text-slate-600">·</span>
          <span>{stat2}</span>
          {open_prs !== undefined && open_prs > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-blue-400">{open_prs} PRs</span>
            </>
          )}
        </div>
        {uptime_pct !== undefined && (
          <span className="text-xs text-slate-500 font-mono">{uptime_pct.toFixed(1)}%</span>
        )}
      </div>

      {/* ARR (optional) */}
      {arr_aud !== undefined && (
        <div className="mt-2 text-xs text-slate-500">
          ARR: <span className="text-slate-300 font-medium">A${(arr_aud / 1000).toFixed(0)}k</span>
        </div>
      )}
    </div>
  );
}

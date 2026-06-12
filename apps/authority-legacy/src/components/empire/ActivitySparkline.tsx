'use client';

// 14-day commit sparkline. Recharts already loaded by the integrations
// dashboard. Uses empire CSS-var tokens — red accent matches --red-400.

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { DailyCommitCount } from '@/lib/developers/types';

export function ActivitySparkline({
  data,
  height = 64,
}: {
  data: DailyCommitCount[];
  height?: number;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="developerSparklineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--red-400)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--red-400)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <Tooltip
            cursor={{ stroke: 'var(--border-default)' }}
            contentStyle={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-primary)',
              padding: '6px 8px',
            }}
            labelStyle={{ color: 'var(--ink-tertiary)' }}
            itemStyle={{ color: 'var(--ink-primary)' }}
            formatter={(value: number) => [value, 'commits']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--red-400)"
            strokeWidth={1.5}
            fill="url(#developerSparklineFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

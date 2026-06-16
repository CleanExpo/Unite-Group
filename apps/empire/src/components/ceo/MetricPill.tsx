'use client';

interface MetricPillProps {
  icon: string;        // emoji
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string; // e.g. "+12%"
  color?: 'green' | 'blue' | 'amber' | 'red' | 'slate';
}

export function MetricPill({ icon, label, value, trend, trendValue, color = 'slate' }: MetricPillProps) {
  const colors = {
    green: 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400',
    blue: 'bg-blue-950/60 border-blue-800/40 text-blue-400',
    amber: 'bg-amber-950/60 border-amber-800/40 text-amber-400',
    red: 'bg-red-950/60 border-red-800/40 text-red-400',
    slate: 'bg-slate-800/60 border-slate-700/40 text-slate-300',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${colors[color]}`}>
      <span>{icon}</span>
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
      {trend && trendValue && (
        <span className={trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
        </span>
      )}
    </div>
  );
}

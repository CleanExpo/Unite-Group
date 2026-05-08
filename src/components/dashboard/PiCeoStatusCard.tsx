'use client';

import { useEffect, useState } from 'react';

interface PiCeoHealth {
  session_id: string | null;
  task_title: string | null;
  confidence: number | null;
  last_updated: string | null;
  plan_units_count: number;
  source: string;
  pi_ceo_api_url: string | null;
}

export function PiCeoStatusCard() {
  const [data, setData] = useState<PiCeoHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pi-ceo/health')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
        <div className="h-4 w-24 bg-white/10 rounded mb-3" />
        <div className="h-6 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-32 bg-white/10 rounded" />
      </div>
    );
  }

  const isLive = data?.source !== 'unavailable';

  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-teal-400 uppercase tracking-wider">
          Pi-CEO
        </span>
        <span className={`inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-teal-400' : 'bg-slate-600'}`} />
      </div>

      {isLive ? (
        <>
          <p className="text-sm font-medium text-white/90 leading-snug mb-2 line-clamp-2">
            {data?.task_title ?? 'Autonomous system running'}
          </p>
          <div className="flex items-center gap-3 text-xs text-white/50">
            {data?.confidence != null && (
              <span>{data.confidence}% confidence</span>
            )}
            {(data?.plan_units_count ?? 0) > 0 && (
              <span>{data!.plan_units_count} units planned</span>
            )}
          </div>
          {data?.session_id && (
            <p className="mt-2 font-mono text-xs text-white/30 truncate">
              {data.session_id}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-white/40">Autonomous system offline</p>
      )}
    </div>
  );
}

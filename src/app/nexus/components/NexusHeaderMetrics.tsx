'use client';

import React from 'react';

interface MetricsData {
  swarm_health: string;
  last_meaningful_update: string;
  new_ideas_generated: number;
  ideas_filtered_low_value: number;
  cards_currently_blocked: number;
  items_waiting_founder: number;
  work_shipped: number;
  system_confidence: number;
  next_best_move: string;
}

export default function NexusHeaderMetrics({ metrics }: { metrics: MetricsData | null }) {
  if (!metrics) {
    return (
      <div className="border-b border-white/10 bg-black/60 px-6 py-4">
        <div className="text-white/60 text-sm">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="border-b border-white/10 bg-black/60 px-6 py-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-8">
          <div>
            <span className="text-white/60">Swarm Health:</span>{' '}
            <span className="font-medium text-green-400">{metrics.swarm_health}</span>
          </div>

          <div>
            <span className="text-white/60">Last Update:</span>{' '}
            <span className="font-mono text-white/70">{metrics.last_meaningful_update}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded bg-emerald-500/20 px-2 pb-px pt-px text-xs text-emerald-400">
              +{metrics.new_ideas_generated} ideas
            </div>
            <div className="rounded bg-amber-500/20 px-2 pb-px pt-px text-xs text-amber-400">
              {metrics.ideas_filtered_low_value} filtered
            </div>
          </div>

          <div>
            <span className="text-red-400 font-medium">{metrics.cards_currently_blocked}</span> blocked
          </div>

          <div>
            <span className="text-orange-400 font-medium">{metrics.items_waiting_founder}</span> awaiting decision
          </div>

          <div>
            <span className="text-emerald-400 font-medium">{metrics.work_shipped}</span> shipped
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-white/60">Confidence:</span>{' '}
            <span className="font-mono text-xl font-semibold text-emerald-400">{metrics.system_confidence}%</span>
          </div>
          <div className="max-w-[260px] text-right text-xs text-white/60 tracking-tight">
            Next move: {metrics.next_best_move}
          </div>
        </div>
      </div>
    </div>
  );
}

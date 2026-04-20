'use client';

import type { EeatDigestData } from '@/lib/digest/buildEeatDigestSection';

interface EeatDigestSectionProps {
  data: EeatDigestData;
}

export function EeatDigestSection({ data }: EeatDigestSectionProps) {
  if (data.skipped) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <p className="text-sm text-neutral-500">E.E.A.T. tracking starting next week — your Authority Score will appear here.</p>
      </div>
    );
  }

  const gradeColor: Record<string, string> = {
    A: 'text-green-600',
    B: 'text-blue-600',
    C: 'text-yellow-600',
    D: 'text-orange-600',
    F: 'text-red-600',
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Authority Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-bold text-neutral-900">{data.score}</span>
            <span className={`text-2xl font-bold ${gradeColor[data.grade] ?? 'text-neutral-600'}`}>{data.grade}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg">{data.delta_arrow}</span>
          <p className="text-sm text-neutral-600 mt-1">{data.delta_label}</p>
        </div>
      </div>

      {data.top_mover && (
        <p className="text-sm text-neutral-500">
          Biggest mover: <span className="font-medium text-neutral-700">{data.top_mover}</span>
        </p>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">This week&apos;s action</p>
        <p className="text-sm text-blue-900">{data.action}</p>
      </div>
    </div>
  );
}

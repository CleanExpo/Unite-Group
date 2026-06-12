/**
 * LayeredCommandCenterShell — UNI-2061 Phase 3
 *
 * Wraps the existing CommandCenterShell with `.theme-layered` scope
 * and renders KPI tiles using Phase 2 primitives (KPI, Chip, HealthBar).
 *
 * This is a presentation-layer variant. It reuses all server-read
 * infrastructure from the existing page; nothing new is fetched.
 */

import { KPI, type KPIProps } from '@/components/founder/ui/KPI';
import { HealthBar } from '@/components/founder/ui/HealthBar';
import { LiveIndicator } from '@/components/founder/ui/LiveIndicator';

export interface LayeredCommandCenterShellProps {
  kpiTiles: KPIProps[];
  integrationHealth: Array<{
    name: string;
    value: number;
    max: number;
    status: 'ok' | 'error' | 'stale';
  }>;
  liveState: 'live' | 'paused';
  children?: React.ReactNode;
}

export function LayeredCommandCenterShell({
  kpiTiles,
  integrationHealth,
  liveState,
  children,
}: LayeredCommandCenterShellProps) {
  return (
    <div className="theme-layered min-h-screen w-full">
      {/* Top bar: live indicator + status */}
      <header className="flex items-center justify-between px-6 py-3 bg-layered-paper shadow-layered-1">
        <h1 className="text-layered-text-primary text-lg font-bold tracking-tight">
          Unite-Grouptn Command Center
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-layered-text-muted text-xs">
            {new Date().toLocaleDateString('en-AU', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <LiveIndicator state={liveState} />
        </div>
      </header>

      {/* KPI bento row */}
      <section className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiTiles.map((kpi, i) => (
            <KPI key={i} {...kpi} />
          ))}
        </div>
      </section>

      {/* Integration health bars */}
      <section className="px-6 pb-6">
        <h2 className="text-layered-text-secondary text-sm font-semibold mb-3">
          Integration Mirror Health
        </h2>
        <div className="space-y-3">
          {integrationHealth.map((h) => (
            <div key={h.name} className="flex items-center gap-3">
              <span className="text-layered-text-primary text-sm w-24 shrink-0">
                {h.name}
              </span>
              <div className="flex-1">
                <HealthBar value={h.value} max={h.max} />
              </div>
              <span className="text-layered-text-muted text-xs w-16 text-right">
                {h.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Children = existing CommandCenterShell panels */}
      <div className="px-6 pb-12">{children}</div>
    </div>
  );
}

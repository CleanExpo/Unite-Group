// src/app/(founder)/founder/schedule/page.tsx
//
// Founder viewer for the app's scheduled cron jobs. Single source of truth is
// apps/web/vercel.json "crons" (statically imported — real config, no mock).
//
// Last-run honesty (No-Invaders): per-cron run telemetry is not recorded
// anywhere in the schema. The one evidenced exception is os-health-rollup,
// whose every run rewrites dashboard_health.reported_at — that timestamp is
// shown for that row only; every other row is an honest "—".

export const dynamic = 'force-dynamic'

import { PageHeader } from '@/components/ui/PageHeader'
import { loadDashboardHealthFromSupabase } from '@/lib/command-centre/dashboard-health-supabase'
import { cronNameFromPath, humaniseCronSchedule } from '@/lib/cron/humanise-schedule'
import vercelConfig from '../../../../../vercel.json'

function formatAest(iso: string): string {
  const formatted = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
  return `${formatted} AEST`
}

const thClass = 'text-left text-xs font-medium uppercase tracking-wider px-4 py-2'
const tdClass = 'px-4 py-2.5 text-sm align-top'

export default async function SchedulePage() {
  const crons = vercelConfig.crons

  // os-health-rollup rewrites dashboard_health.reported_at on every run —
  // the max reported_at is that cron's last successful run. A failed load
  // (RLS, network, missing table) degrades to "—", never a fabricated time.
  let osHealthLastRun: string | null = null
  const health = await loadDashboardHealthFromSupabase()
  if (health.ok) {
    const times = health.result.entries
      .map((entry) => entry.updated_at)
      .filter((t): t is string => typeof t === 'string')
      .sort()
    osHealthLastRun = times.at(-1) ?? null
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Schedule"
        subtitle={`${crons.length} scheduled jobs · source: vercel.json`}
        className="mb-6"
      />
      <div
        className="rounded-sm overflow-x-auto"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <th className={thClass}>Job</th>
              <th className={thClass}>Cron expression</th>
              <th className={thClass}>Schedule</th>
              <th className={thClass}>Last run</th>
            </tr>
          </thead>
          <tbody>
            {crons.map((cron) => {
              const name = cronNameFromPath(cron.path)
              const isOsHealthRollup = name === 'os-health-rollup'
              return (
                <tr
                  key={cron.path}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className={tdClass} style={{ color: 'var(--color-text-primary)' }}>
                    {name}
                  </td>
                  <td
                    className={`${tdClass} font-mono text-xs`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {cron.schedule}
                  </td>
                  <td className={tdClass} style={{ color: 'var(--color-text-secondary)' }}>
                    {humaniseCronSchedule(cron.schedule)}
                  </td>
                  <td className={tdClass} style={{ color: 'var(--color-text-secondary)' }}>
                    {isOsHealthRollup && osHealthLastRun ? (
                      <span>
                        {formatAest(osHealthLastRun)}
                        <span
                          className="block text-xs"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          via dashboard_health.reported_at
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Per-run telemetry not yet recorded — only os-health-rollup leaves an
        evidenced timestamp (dashboard_health.reported_at).
      </p>
    </div>
  )
}

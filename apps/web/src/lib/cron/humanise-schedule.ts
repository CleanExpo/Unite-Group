// src/lib/cron/humanise-schedule.ts
//
// Pure helpers for the founder /founder/schedule viewer. Humanises the
// 5-field cron patterns actually present in apps/web/vercel.json — nothing
// speculative. Unrecognised expressions fall back to the raw string
// (honest, never invented).
//
// Timezone: Vercel crons run in UTC. AEST = Australia/Brisbane (UTC+10,
// no DST), so the conversion is a fixed +10h offset.

const AEST_OFFSET_HOURS = 10

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Derive a display name from a cron route path.
 * '/api/cron/os-health-rollup' → 'os-health-rollup'
 * '/api/cron/coaches/life' → 'coaches/life'
 * '/api/cron/strategy-daily?business=dr' → 'strategy-daily (business=dr)'
 */
export function cronNameFromPath(path: string): string {
  const stripped = path.replace(/^\/api\/cron\//, '')
  const [base, query] = stripped.split('?')
  return query ? `${base} (${query})` : base
}

/**
 * Humanise a 5-field cron expression (minute hour dom month dow) into an
 * en-AU description carrying both UTC and AEST times. Only the patterns
 * present in vercel.json are recognised:
 *   - minute-step form (slash-N minute) → 'Every N minutes'
 *   - 'M H * * *' → 'Daily at HH:MM UTC (HH:MM AEST)'
 *   - 'M H * * D' → 'Weekly on <Day> at HH:MM UTC (<Day> HH:MM AEST)'
 * Anything else returns the raw expression unchanged.
 */
export function humaniseCronSchedule(expression: string): string {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return expression
  const [minute, hour, dom, month, dow] = fields

  // Every N minutes: */N * * * *
  const everyN = /^\*\/(\d+)$/.exec(minute)
  if (everyN && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Every ${Number(everyN[1])} minutes`
  }

  const m = /^\d+$/.test(minute) ? Number(minute) : null
  const h = /^\d+$/.test(hour) ? Number(hour) : null
  if (m === null || h === null || m > 59 || h > 23 || dom !== '*' || month !== '*') {
    return expression
  }

  const aestHour = (h + AEST_OFFSET_HOURS) % 24
  const utcTime = `${pad2(h)}:${pad2(m)}`
  const aestTime = `${pad2(aestHour)}:${pad2(m)}`

  // Daily: M H * * *
  if (dow === '*') {
    return `Daily at ${utcTime} UTC (${aestTime} AEST)`
  }

  // Weekly: M H * * D (single day-of-week, 0-7 where 0 and 7 are Sunday)
  if (/^\d$/.test(dow) && Number(dow) <= 7) {
    const utcDay = DAY_NAMES[Number(dow) % 7]
    const dayShift = h + AEST_OFFSET_HOURS >= 24 ? 1 : 0
    const aestDay = DAY_NAMES[(Number(dow) % 7 + dayShift) % 7]
    return `Weekly on ${utcDay} at ${utcTime} UTC (${aestDay} ${aestTime} AEST)`
  }

  return expression
}

import { describe, expect, it } from 'vitest'
import { cronNameFromPath, humaniseCronSchedule } from '../humanise-schedule'

describe('cronNameFromPath', () => {
  it('strips the /api/cron/ prefix', () => {
    expect(cronNameFromPath('/api/cron/os-health-rollup')).toBe('os-health-rollup')
  })

  it('keeps nested segments', () => {
    expect(cronNameFromPath('/api/cron/coaches/life')).toBe('coaches/life')
  })

  it('surfaces the query string as a suffix', () => {
    expect(cronNameFromPath('/api/cron/strategy-daily?business=dr')).toBe(
      'strategy-daily (business=dr)',
    )
  })
})

describe('humaniseCronSchedule', () => {
  it('humanises every-N-minutes schedules', () => {
    expect(humaniseCronSchedule('*/15 * * * *')).toBe('Every 15 minutes')
    expect(humaniseCronSchedule('*/5 * * * *')).toBe('Every 5 minutes')
    expect(humaniseCronSchedule('*/30 * * * *')).toBe('Every 30 minutes')
  })

  it('humanises daily schedules with UTC and AEST times', () => {
    expect(humaniseCronSchedule('0 16 * * *')).toBe('Daily at 16:00 UTC (02:00 AEST)')
    expect(humaniseCronSchedule('50 1 * * *')).toBe('Daily at 01:50 UTC (11:50 AEST)')
    expect(humaniseCronSchedule('15 21 * * *')).toBe('Daily at 21:15 UTC (07:15 AEST)')
    expect(humaniseCronSchedule('30 19 * * *')).toBe('Daily at 19:30 UTC (05:30 AEST)')
  })

  it('humanises weekly schedules, shifting the AEST day across midnight', () => {
    expect(humaniseCronSchedule('0 20 * * 0')).toBe(
      'Weekly on Sunday at 20:00 UTC (Monday 06:00 AEST)',
    )
    expect(humaniseCronSchedule('0 15 * * 1')).toBe(
      'Weekly on Monday at 15:00 UTC (Tuesday 01:00 AEST)',
    )
  })

  it('keeps the AEST day when the +10h offset stays within the same day', () => {
    expect(humaniseCronSchedule('0 5 * * 3')).toBe(
      'Weekly on Wednesday at 05:00 UTC (Wednesday 15:00 AEST)',
    )
  })

  it('falls back to the raw expression for unrecognised patterns', () => {
    expect(humaniseCronSchedule('0 0 1 * *')).toBe('0 0 1 * *')
    expect(humaniseCronSchedule('not a cron')).toBe('not a cron')
    expect(humaniseCronSchedule('0 16 * * 1-5')).toBe('0 16 * * 1-5')
  })
})

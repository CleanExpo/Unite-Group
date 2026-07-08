import { describe, it, expect } from 'vitest'
import {
  summariseDashboardHealthRows,
  resolveStaleHours,
  loadDashboardHealthFromSupabase,
  type DashboardHealthRow,
} from '@/lib/command-centre/dashboard-health-supabase'

const NOW = () => new Date('2026-07-08T12:00:00.000Z')

function row(id: string, over: Partial<DashboardHealthRow> = {}): DashboardHealthRow {
  return { id, title: null, status: 'GREEN', severity: 'P3', reported_at: '2026-07-08T11:00:00.000Z', ...over }
}

describe('summariseDashboardHealthRows (UNI-2229 cloud OS Health)', () => {
  it('maps fresh rows into the tile contract with supabase source paths', () => {
    const r = summariseDashboardHealthRows([row('mesh', { title: 'Mesh Fleet' }), row('hermes', { status: 'RED', severity: 'p0' })], NOW)
    expect(r.dashboard_dir).toBe('supabase://dashboard_health')
    expect(r.entries).toHaveLength(2)
    expect(r.entries[0]).toMatchObject({ id: 'mesh', title: 'Mesh Fleet', status: 'GREEN', source_path: 'supabase://dashboard_health/mesh', read_error: null })
    expect(r.entries[1]).toMatchObject({ status: 'RED', severity: 'P0' })
    expect(r.green_count).toBe(1)
    expect(r.red_count).toBe(1)
    expect(r.error_count).toBe(0)
  })

  it('humanises missing titles from the id', () => {
    const r = summariseDashboardHealthRows([row('daily_ops_status', { title: '  ' })], NOW)
    expect(r.entries[0].title).toBe('Daily Ops Status')
  })

  it('a row past the staleness window carries read_error and counts as error, never silently green', () => {
    const r = summariseDashboardHealthRows([row('old', { reported_at: '2026-07-06T00:00:00.000Z' })], NOW, 26)
    expect(r.entries[0].read_error).toMatch(/stale — last report 2026-07-06/)
    expect(r.error_count).toBe(1)
    expect(r.green_count).toBe(0)
  })

  it('null/garbage reported_at is treated as stale', () => {
    const r = summariseDashboardHealthRows([row('never', { reported_at: null })], NOW)
    expect(r.entries[0].read_error).toMatch(/stale — last report never/)
  })

  it('unknown status strings normalise to unknown', () => {
    const r = summariseDashboardHealthRows([row('weird', { status: 'FINE-ISH' })], NOW)
    expect(r.entries[0].status).toBe('unknown')
  })

  it('resolveStaleHours: env override, junk ignored', () => {
    expect(resolveStaleHours({ UNITE_DASHBOARD_STALE_HOURS: '4' })).toBe(4)
    expect(resolveStaleHours({ UNITE_DASHBOARD_STALE_HOURS: 'nope' })).toBe(26)
    expect(resolveStaleHours({})).toBe(26)
  })
})

describe('loadDashboardHealthFromSupabase', () => {
  function clientReturning(payload: { data: unknown; error: { message: string } | null }) {
    return { from: () => ({ select: () => ({ order: async () => payload }) }) }
  }

  it('query error → ok:false with reason (caller falls back honestly)', async () => {
    const r = await loadDashboardHealthFromSupabase(clientReturning({ data: null, error: { message: 'relation missing' } }), NOW)
    expect(r).toEqual({ ok: false, reason: 'relation missing' })
  })

  it('rows → ok:true mapped result; malformed rows dropped', async () => {
    const r = await loadDashboardHealthFromSupabase(
      clientReturning({ data: [row('a'), { nope: true }, null], error: null }),
      NOW,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.result.entries.map((e) => e.id)).toEqual(['a'])
  })
})

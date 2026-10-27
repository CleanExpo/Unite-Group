import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DESIGN_ACTIONS, DESIGN_SYSTEMS } from '../lessons'

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261026120000_design_feedback_loop.sql'), 'utf8')

describe('design feedback migration structure (not database execution)', () => {
  it('is founder-gated and additive', () => {
    expect(sql.split('\n')[0]).toMatch(/^-- FOUNDER-GATED/)
    expect(sql).not.toMatch(/\b(drop|truncate|alter table public\.(?!design_)\w+)/i)
  })

  it('forces RLS on both tables and gives anon nothing', () => {
    for (const t of ['design_events', 'design_lessons']) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`)
      expect(sql).toContain(`alter table public.${t} force row level security;`)
      expect(sql).toContain(`revoke all on table public.${t} from public, anon, authenticated;`)
    }
    expect(sql).not.toMatch(/to anon/)
  })

  it('lets a founder read only their own rows and only service_role write', () => {
    expect(sql.match(/for select to authenticated using \(founder_id = auth\.uid\(\)\)/g)).toHaveLength(2)
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*to authenticated/)
  })

  it('checks the same systems and actions the app validates', () => {
    expect(sql).toContain(`system in (${DESIGN_SYSTEMS.map((s) => `'${s}'`).join(', ')})`)
    expect(sql).toContain(`action in (${DESIGN_ACTIONS.map((a) => `'${a}'`).join(', ')})`)
    expect(sql).toContain('char_length(reason) <= 500')
  })
})

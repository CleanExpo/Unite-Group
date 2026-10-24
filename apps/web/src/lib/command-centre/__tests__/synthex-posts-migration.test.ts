import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// The calendar's one migration must be additive, reversible and founder-scoped.
const dir = join(process.cwd(), 'supabase/migrations')
const file = readdirSync(dir).find(f => f.endsWith('_cc_synthex_post_events.sql'))
const sql = file ? readFileSync(join(dir, file), 'utf8') : ''
const body = sql.replace(/--.*$/gm, '')

describe('cc_synthex_post_events migration', () => {
  it('exists and only creates (no drop, alter of other tables, or data change)', () => {
    expect(file).toBeDefined()
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS cc_synthex_post_events/i)
    expect(body).not.toMatch(/\b(DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+\w+\s+SET|INSERT\s+INTO)\b/i)
    expect(body.match(/ALTER TABLE\s+(\w+)/gi)?.every(m => /cc_synthex_post_events/i.test(m)) ?? true).toBe(true)
  })
  it('documents its rollback and is founder-scoped under forced RLS with no client write policy', () => {
    expect(sql).toMatch(/--\s*Rollback:[\s\S]*DROP TABLE IF EXISTS cc_synthex_post_events/i)
    expect(body).toMatch(/ENABLE ROW LEVEL SECURITY/i)
    expect(body).toMatch(/FORCE ROW LEVEL SECURITY/i)
    expect(body).toMatch(/FOR SELECT USING \(founder_id = auth\.uid\(\)\)/i)
    expect(body).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/i)
    expect(body).not.toMatch(/USING\s*\(\s*true\s*\)/i)
    expect(body).toMatch(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_policies/i)
    expect(body).toMatch(/founder_id\s+UUID NOT NULL REFERENCES auth\.users/i)
    expect(body).toMatch(/CHECK \(status IN \('drafted', 'awaiting_approval', 'approved', 'scheduled', 'published', 'failed'\)\)/i)
  })
})

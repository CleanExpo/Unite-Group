import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261024090000_alert_delivery_log.sql'), 'utf8')

describe('alert claim migration structure (not database execution)', () => {
  it('serialises different leads sharing a dedup key before checking coverage', () => {
    const lock = migration.indexOf('perform pg_advisory_xact_lock(hashtextextended(p_dedup_key, 0))')
    expect(lock).toBeGreaterThan(-1)
    expect(lock).toBeLessThan(migration.indexOf('if exists ('))
  })

  it('keeps both same-source claim inserts idempotent', () => {
    expect(migration.match(/on conflict on constraint alert_delivery_log_source_kind_source_id_channel_key do nothing/g)).toHaveLength(2)
    expect(migration).toContain('returning delivery.channel')
  })

  it('can be re-applied without failing on objects it already created', () => {
    expect(migration).toContain('create table if not exists public.alert_delivery_log (')
    expect(migration.match(/create index if not exists alert_delivery_log_/g)).toHaveLength(2)
    expect(migration).toContain('create or replace function public.claim_alert(')
    expect(migration).not.toMatch(/^create (table|index|function) (?!if not exists)/m)
  })
})

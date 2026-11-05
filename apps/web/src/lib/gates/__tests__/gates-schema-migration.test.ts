import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// UNI-3269 (GATES-0). Structure checks on the migration text. The database behaviour itself
// (fingerprint abort, org isolation, write denial) is proven on a throwaway Postgres by
// scripts/gates-schema-db-proof.sh; this file guards the shape so a careless edit fails fast.

const MIGRATION = 'supabase/migrations/20261105040000_gates_schema.sql'
const ROLLBACK = 'supabase/manual-applies/2026-11-05_gates_schema_rollback.sql'
const path = resolve(process.cwd(), MIGRATION)
const sql = existsSync(path) ? readFileSync(path, 'utf8') : ''
// Comments removed, so prose cannot satisfy or trip a check.
const code = sql
  .split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')

export const GATES_TABLES = [
  'brands',
  'campaigns',
  'sites',
  'events',
  'daily_rollup',
  'experiments',
  'assignments',
  'channels',
  'posts',
  'post_metrics',
  'audience_evidence',
  'gate_results',
] as const

describe('gates schema migration (structure, not database execution)', () => {
  it('exists, is founder-gated, and runs in one transaction', () => {
    expect(sql, `${MIGRATION} is missing`).not.toBe('')
    expect(sql.split('\n')[0]).toMatch(/^-- FOUNDER-GATED/)
    expect(code.trimStart()).toMatch(/^begin;/i)
    expect(code.trimEnd()).toMatch(/commit;$/i)
  })

  it('opens with the fingerprint check before creating anything', () => {
    const fp = code.search(/do \$\$/i)
    const firstCreate = code.search(/\bcreate\s+(schema|table|function|index|policy)\b/i)
    expect(fp).toBeGreaterThan(-1)
    expect(firstCreate).toBeGreaterThan(fp)
    const block = code.slice(fp, code.indexOf('$$;', fp))
    for (const catalog of ['pg_namespace', 'pg_class', 'pg_proc']) expect(block).toContain(catalog)
    expect(block).toMatch(/raise exception/i)
  })

  it('never replaces, drops, alters or truncates anything', () => {
    expect(code).not.toMatch(/create\s+or\s+replace/i)
    expect(code).not.toMatch(/\b(drop|truncate)\b/i)
    // ALTER is allowed only to switch on row security for gates tables and their partitions.
    const alters = code.match(/\balter\s+[^;]*;/gi) ?? []
    for (const a of alters) expect(a).toMatch(/^alter table gates\.\w+ (enable|force) row level security;$/i)
  })

  it('creates objects only inside schema gates', () => {
    const created = code.match(/\bcreate\s+(?:unique\s+)?(?:table|function|index|policy|view|type|sequence|trigger)\s+[^\s(]+(?:\s+on\s+[^\s(]+)?/gi) ?? []
    expect(created.length).toBeGreaterThan(12)
    for (const c of created) {
      const target = c.match(/\s+on\s+([^\s(]+)$/i)?.[1] ?? c.split(/\s+/).pop()!
      expect(target, c).toMatch(/^gates\./)
    }
    // No other schema is named at all, except auth.jwt() (read-only, for the org claim).
    expect(code).not.toMatch(/\b(public|storage|extensions)\.\w+/i)
    for (const ref of code.match(/\bauth\.\w+/gi) ?? []) expect(ref).toBe('auth.jwt')
  })

  it('creates all twelve tables, with org_id, RLS enabled and forced, and an org_id read policy', () => {
    for (const t of GATES_TABLES) {
      const def = code.match(new RegExp(`create table gates\\.${t} \\(([\\s\\S]*?)\\n\\)`, 'i'))
      expect(def, `create table gates.${t}`).not.toBeNull()
      expect(def![1]).toMatch(/\borg_id uuid not null\b/)
      expect(code).toContain(`alter table gates.${t} enable row level security;`)
      expect(code).toContain(`alter table gates.${t} force row level security;`)
      expect(code).toMatch(
        new RegExp(`create policy ${t}_org_read on gates\\.${t}\\s+for select to authenticated\\s+using \\(org_id = gates\\.jwt_org_id\\(\\)\\);`, 'i'),
      )
      expect(code).toContain(`revoke all on table gates.${t} from public, anon, authenticated;`)
    }
    expect(code.match(/create table gates\.\w+ \(/gi)).toHaveLength(GATES_TABLES.length)
  })

  it('gives anon nothing and authenticated read-only access', () => {
    expect(code).not.toMatch(/\bto\s+(?:[\w, ]*\b)?anon\b/i)
    expect(code).not.toMatch(/grant\s+[^;]*\b(insert|update|delete|truncate|all)\b[^;]*\bto\s+[^;]*\bauthenticated\b/i)
    expect(code).not.toMatch(/for\s+(insert|update|delete|all)\s+to\s+authenticated/i)
  })

  it('partitions events by month on ts', () => {
    expect(code).toMatch(/create table gates\.events \([\s\S]*?\n\) partition by range \(ts\);/i)
    expect(code).toMatch(/primary key \(id, ts\)/i)
    expect(code).toMatch(/create table gates\.events_default partition of gates\.events default;/i)
    // Every promised month by name: a missing month would silently route its rows to the default partition.
    const months = ['2026m11', '2026m12', ...Array.from({ length: 12 }, (_, i) => `2027m${String(i + 1).padStart(2, '0')}`)]
    for (const m of months) {
      expect(code).toMatch(new RegExp(`create table gates\\.events_y${m} partition of gates\\.events for values from`, 'i'))
      expect(code).toContain(`alter table gates.events_y${m} enable row level security;`)
    }
  })

  it('reads the org from the signed app_metadata claim, never from user-editable metadata', () => {
    expect(code).toMatch(/auth\.jwt\(\) -> 'app_metadata' ->> 'org_id'/)
    expect(code).not.toMatch(/user_metadata/)
  })

  it('ships a rollback that can only remove gates (RESTRICT, never CASCADE)', () => {
    const rb = resolve(process.cwd(), ROLLBACK)
    expect(existsSync(rb), ROLLBACK).toBe(true)
    const rbCode = readFileSync(rb, 'utf8')
      .split('\n')
      .map((l) => l.replace(/--.*$/, ''))
      .join('\n')
    // CASCADE silently drops outside dependants; RESTRICT makes Postgres refuse and name them.
    expect(rbCode).not.toMatch(/\bcascade\b/i)
    expect(rbCode).toMatch(/drop schema gates restrict;/)
    expect(rbCode).toMatch(/drop function gates\.jwt_org_id\(\) restrict;/)
    for (const t of GATES_TABLES) expect(rbCode).toMatch(new RegExp(`\\bgates\\.${t}\\b`))
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PUBLIC_COLUMNS } from '../published'

// Structure only, not database execution. The executed proof is supabase/tests/card_film_src_rls.sql
// (run by scripts/card-db-proof.sh section 7 on a throwaway Postgres 15, with planted-defect controls).
const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261123100000_card_profiles_film_src.sql'), 'utf8')
const statements = migration.replace(/^\s*--.*$/gm, '')

describe('card film_src migration structure', () => {
  it('is marked founder-gated and not applied', () => {
    expect(migration.split('\n')[0]).toMatch(/^-- FOUNDER-GATED: NOT applied to production/)
  })

  it('adds one nullable column and touches no other table', () => {
    expect(statements).toContain('alter table public.card_profiles add column if not exists film_src text;')
    expect(statements).not.toMatch(/not null/i)
    expect(statements.match(/alter table /g)).toHaveLength(2)
  })

  it('gives anon read of film_src and gives authenticated no write on it', () => {
    expect(statements.match(/^grant .*$/gm)).toEqual(['grant select (film_src) on table public.card_profiles to anon;'])
  })

  it('keeps the CHECK to our own /cards/media/ files', () => {
    expect(statements).toContain("film_src like '/cards/media/%'")
    expect(statements).toContain("film_src not like '%..%'")
    expect(statements).toContain("film_src ~ '^/cards/media/[A-Za-z0-9._/-]+$'")
  })

  it('the app reads the column the migration grants', () => {
    expect(PUBLIC_COLUMNS.split(',').map((c) => c.trim())).toContain('film_src')
  })

  it('the proof is wired into the card database proof script, with planted-defect controls', () => {
    const script = readFileSync(resolve(process.cwd(), 'scripts/card-db-proof.sh'), 'utf8')
    expect(script).toContain('card_film_src_rls.sql')
    expect(script).toContain('film mutant')
  })
})

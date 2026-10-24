import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261024210000_card_enquiries_feedback.sql'),
  'utf8',
)
const proof = readFileSync(resolve(process.cwd(), 'supabase/tests/card_enquiries_feedback_rls.sql'), 'utf8')

describe('card capture migration structure (not database execution)', () => {
  it('forces row level security on all three tables', () => {
    for (const table of ['card_owners', 'card_enquiries', 'card_feedback']) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`)
      expect(migration).toContain(`alter table public.${table} force row level security;`)
    }
  })

  it('gives anon a column-limited INSERT and nothing else', () => {
    const anonGrants = migration.match(/^grant .* to anon;$/gm) ?? []
    expect(anonGrants).toEqual([
      'grant insert (card_slug, first_name, business, ask, reply_email, source) on table public.card_enquiries to anon;',
      'grant insert (card_slug, first_name, answers, device) on table public.card_feedback to anon;',
    ])
    expect(migration).not.toMatch(/for (select|update|delete|all) to anon/)
  })

  it('lets a founder read only rows for cards they own', () => {
    expect(migration.match(/owner\.founder_id = auth\.uid\(\)/g)).toHaveLength(2)
    expect(migration).toContain('for select to authenticated using (founder_id = auth.uid())')
  })

  it('stores no phone number and keeps the briefed limits', () => {
    const statements = migration.replace(/^\s*--.*$/gm, '')
    expect(statements).not.toMatch(/phone|mobile/i)
    // limits apply to the stored value itself, never a trimmed copy, so padding cannot smuggle bulk past them
    expect(migration.match(/check \(char_length\(first_name\) <= 60 and first_name ~ '\[\^\[:space:\]\]'\)/g)).toHaveLength(2)
    expect(migration).toContain("check (char_length(ask) <= 2000 and ask ~ '[^[:space:]]')")
    expect(migration).not.toContain('btrim(')
    expect(migration).toContain('octet_length(answers::text) <= 4000')
  })

  it('can be re-applied', () => {
    expect(migration).not.toMatch(/^create (table|index|function) (?!if not exists)/m)
    // every policy is created inside an "if not exists (select 1 from pg_policies ...)" guard
    expect(migration).not.toMatch(/^create policy/m)
    expect(migration.match(/create policy/g)).toHaveLength(migration.match(/and policyname = /g)?.length ?? -1)
  })

  it('ships a database proof that anon cannot SELECT', () => {
    expect(proof).toContain("expect_error('select count(*) from public.card_enquiries', '42501'")
    expect(proof).toContain("expect_error('select count(*) from public.card_feedback', '42501'")
    expect(proof).toContain('CARD_RLS_PROOF_PASS')
  })
})

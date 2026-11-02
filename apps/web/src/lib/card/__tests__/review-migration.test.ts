import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Structure only, not database execution. The executed proof is supabase/tests/card_review_requests_rls.sql
// (run by scripts/card-db-proof.sh on a throwaway Postgres 15, with planted-defect controls).
const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261102140000_card_review_requests.sql'), 'utf8')
const statements = migration.replace(/^\s*--.*$/gm, '')
const proof = readFileSync(resolve(process.cwd(), 'supabase/tests/card_review_requests_rls.sql'), 'utf8')
const TABLES = ['card_review_requests', 'card_review_optouts', 'card_review_events']

describe('card review requests migration structure', () => {
  it('is marked founder-gated and not applied', () => {
    expect(migration.split('\n')[0]).toMatch(/^-- FOUNDER-GATED: NOT applied to production/)
  })

  it('forces row level security on every new table', () => {
    for (const t of TABLES) {
      expect(statements).toContain(`alter table public.${t} enable row level security;`)
      expect(statements).toContain(`alter table public.${t} force row level security;`)
    }
  })

  it('gives anon no table access and only the event-logging function', () => {
    const anonGrants = statements.match(/^grant .* to anon[ ,;].*$/gm) ?? []
    expect(anonGrants).toEqual([
      'grant select (google_place_id) on table public.card_profiles to anon;',
      'grant execute on function public.card_log_review_event(text, text, uuid, text) to anon, authenticated, service_role;',
    ])
    expect(statements).not.toMatch(/grant (insert|update|delete)[^;]*card_review_[a-z]+[^;]* to (anon|authenticated)/)
  })

  it('writes only through security-definer functions with a pinned search_path', () => {
    const fns = statements.match(/create or replace function public\.\w+/g) ?? []
    expect(fns).toEqual([
      'create or replace function public.card_log_review_event',
      'create or replace function public.card_create_review_request',
      'create or replace function public.card_record_review_optout',
    ])
    expect(statements.match(/security definer set search_path = public, pg_temp/g)).toHaveLength(3)
  })

  it('owners read only rows for cards they own', () => {
    expect(statements.match(/owner\.founder_id = auth\.uid\(\)/g)).toHaveLength(3)
  })

  it('requires consent, keeps no raw contact for owner channels, dedupes per recipient per day', () => {
    expect(statements).toContain('consent_confirmed_at timestamptz not null')
    expect(statements).toContain("if p_consent is not true then raise exception 'card_review_consent_required'")
    expect(statements).toContain("check (recipient_contact is null or (channel = 'sent_email'")
    expect(statements).toContain('unique (card_slug, recipient_hash, request_day)')
    // v1 cannot create a we-send request
    expect(statements).toContain("p_channel not in ('owner_sms', 'owner_email', 'owner_share')")
  })

  it('events hold no IP, user agent, name or contact column', () => {
    const events = statements.slice(statements.indexOf('create table if not exists public.card_review_events'))
    const body = events.slice(0, events.indexOf(');'))
    expect(body).not.toMatch(/\b(ip|ip_address|user_agent|first_name|email|phone|contact)\b/)
  })

  it('never uses a regex repeat count above 255 (Postgres rejects it at check time)', () => {
    for (const m of statements.matchAll(/\{(\d+),(\d+)\}/g)) expect(Number(m[2])).toBeLessThanOrEqual(255)
  })

  it('can be re-applied', () => {
    expect(statements).not.toMatch(/^create (table|index) (?!if not exists)/m)
    expect(statements.match(/^create policy/gm)?.length).toBe(statements.match(/^drop policy if exists/gm)?.length)
  })

  it('ships an executed two-tenant proof', () => {
    expect(proof).toContain('CARD_REVIEW_RLS_PROOF_PASS')
    expect(proof).toContain("'card_review_consent_required', 'consent false refused'")
    expect(proof).toContain("'duplicate', 'same recipient same day is a duplicate'")
    expect(proof).toContain("'opted_out', 'opted-out recipient is never asked'")
  })
})

// SQL-text guard for the UNI-2780 subscription-metering migration.
//
// There is no Supabase branch for this change yet (branches cost money and need
// founder approval), so this test is the only automated check on the SQL. It
// proves the TEXT contains the load-bearing constraints; it does NOT prove the
// SQL executes. Execution must be validated on a Supabase database branch.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { POOL_PROVIDERS } from '../accounts'

const DIR = join(__dirname, '../../../../supabase/migrations')
const matches = readdirSync(DIR).filter((f) => /^\d{14}_ai_subscription_metering\.sql$/.test(f))

/** SQL with `--` comments removed, so the rollback section cannot satisfy an assertion. */
function executable(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

describe('ai_subscription_metering migration (text)', () => {
  it('exists exactly once', () => {
    expect(matches).toHaveLength(1)
  })

  const raw = matches.length === 1 ? readFileSync(join(DIR, matches[0]), 'utf8') : ''
  const sql = executable(raw)

  it('widens the provider CHECK to the full pool provider set, keeping the original values', () => {
    const m = sql.match(/add constraint provider_accounts_provider_check check \( ?provider in \(([^)]*)\) ?\)/)
    expect(m, 'provider CHECK not found').not.toBeNull()
    const listed = (m?.[1] ?? '').split(',').map((s) => s.trim().replace(/'/g, ''))
    for (const p of ['claude', 'openai', 'minimax', 'gemini', 'openrouter']) expect(listed).toContain(p)
    expect([...listed].sort()).toEqual([...POOL_PROVIDERS].sort())
  })

  it('makes a subscription account structurally unroutable', () => {
    expect(sql).toMatch(/check \( ?billing_kind <> 'subscription' or routable = false ?\)/)
    expect(sql).toMatch(/add column if not exists routable boolean not null default true/)
    expect(sql).toMatch(/add column if not exists billing_kind text not null default 'metered'/)
    expect(sql).toMatch(/billing_kind in \('metered', ?'subscription', ?'prepaid'\)/)
    expect(sql).toMatch(/add column if not exists plan_price_aud numeric\(10, ?2\)/)
    expect(sql).toMatch(/plan_price_aud is null or plan_price_aud >= 0/)
  })

  it('creates/extends ai_usage_logs additively with founder scoping, account FK and source CHECK', () => {
    expect(sql).toContain('create table if not exists public.ai_usage_logs')
    expect(sql).toMatch(/add column if not exists founder_id uuid/)
    expect(sql).toMatch(/add column if not exists provider_account_id uuid references public\.provider_accounts\(id\) on delete set null/)
    expect(sql).toMatch(/source in \('sdk', ?'cli_claude', ?'cli_codex', ?'cli_cursor', ?'swarm', ?'manual'\)/)
    expect(sql).toMatch(/create unique index if not exists \w+ on public\.ai_usage_logs \(source, ?request_id\) where request_id is not null/)
    expect(sql).toMatch(/alter table public\.ai_usage_logs enable row level security/)
    expect(sql).toMatch(/for select using \(founder_id = auth\.uid\(\)\)/)
  })

  it('seeds the ai_subscriptions cost source idempotently', () => {
    expect(sql).toMatch(/insert into public\.cost_source .*'ai_subscriptions'.* on conflict \(id\) do nothing/)
  })

  it('is additive: no destructive statement outside the commented rollback', () => {
    expect(sql).not.toMatch(/\bdrop table\b/)
    expect(sql).not.toMatch(/\bdrop column\b/)
    expect(sql).not.toMatch(/\btruncate\b/)
    expect(sql).not.toMatch(/\bdelete from\b/)
    expect(raw).toMatch(/ROLLBACK/)
  })
})

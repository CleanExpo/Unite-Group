import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Static checks on the two portal migration files. The behaviour is proven on a throwaway Postgres by
// scripts/portal-invite-db-proof.sh; these catch a careless edit before that runs.
const dir = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations')
const files = ['20261102190000_portal_entitlements.sql', '20261102190100_portal_invite_codes.sql']
const sql = files.map((f) => readFileSync(join(dir, f), 'utf8'))
const all = sql.join('\n')
const code = all.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n') // SQL without its comment lines
const tables = [...all.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1])

describe('portal migrations', () => {
  it('create the expected tables (positive control for the checks below)', () => {
    expect(tables.sort()).toEqual([
      'portal_entitlements', 'portal_invite_attempts', 'portal_invite_codes', 'portal_invite_link_requests',
      'portal_invite_redemptions', 'portal_tenant_members',
    ])
  })

  it.each(tables)('%s has row level security enabled and forced, and nothing granted to anon', (t) => {
    expect(all).toMatch(new RegExp(`alter table public\\.${t} enable row level security;`))
    expect(all).toMatch(new RegExp(`alter table public\\.${t} force row level security;`))
    expect(all).not.toMatch(new RegExp(`grant [^;]*on table[^;]*public\\.${t}[^;]* to [^;]*\\banon\\b`))
  })

  it('stores codes only as a 64-hex hash: no plaintext code column', () => {
    const codes = all.slice(all.indexOf('create table if not exists public.portal_invite_codes'))
    const body = codes.slice(0, codes.indexOf(');'))
    expect(body).toContain("code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$')")
    expect(body).not.toMatch(/\bcode\s+text|\bcode_plain|\bplaintext/)
  })

  it('makes one redemption row per redemption, single use by a unique index (not a used_by column)', () => {
    expect(all).toContain('create unique index if not exists portal_invite_redemptions_single_use on public.portal_invite_redemptions (code_id);')
    expect(all).toMatch(/used_by/) // control: the comment explaining the SYN-1278 lesson is seen, so the next line can fail
    expect(code).not.toMatch(/used_by/)
  })

  it('every security definer function pins search_path and is not executable by anon', () => {
    const fns = [...all.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$\$;/g)]
    expect(fns.length).toBe(4)
    for (const [text, name] of fns) {
      expect(text, name).toContain("set search_path = ''")
      expect(all, name).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon`))
    }
  })

  it('a comp or none plan can never hold a paid module, in the database itself', () => {
    expect(all).toContain("plan = 'paid' or not jsonb_path_exists(modules, '$.* ? (@ == true)')")
    expect(all).toContain('"content": false, "seo": false, "social": false, "voice": false')
  })

  it('is additive only: no drop, truncate or delete statements outside the comment header', () => {
    for (const s of sql) {
      const body = s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
      expect(body).not.toMatch(/\b(drop|truncate)\s+(table|function|index|policy)\b/i)
      expect(body).not.toMatch(/^\s*delete\s+from/im)
    }
  })
})

// The owner helper that joins S3's row rules to the invite membership. Behaviour: scripts/portal-owner-db-proof.sh.
describe('portal owner helper migration', () => {
  const helper = readFileSync(join(dir, '20261103120000_portal_owner_tenant_from_membership.sql'), 'utf8')
  const body = helper.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')

  it('replaces only public.portal_owner_tenant_slug(), same signature, and touches no table', () => {
    expect([...body.matchAll(/create or replace function public\.(\w+)\(\)\s*returns text/g)].map((m) => m[1])).toEqual(['portal_owner_tenant_slug'])
    expect(body).not.toMatch(/\b(create|alter|drop|truncate)\s+(table|policy|index)\b/i)
    expect(body).not.toMatch(/^\s*(insert|update|delete)\b/im)
  })

  it('reads the caller\'s own membership on an aal2 session, oldest first, never a token claim', () => {
    expect(body).toContain('from public.portal_tenant_members m')
    expect(body).toContain('where public.portal_session_is_aal2()')
    expect(body).toContain('and m.user_id = (select auth.uid())')
    expect(body).toContain('order by m.created_at, m.tenant_slug')
    expect(helper).toMatch(/app_metadata/) // control: the header explains the old claim, so the next line can fail
    expect(body).not.toMatch(/app_metadata|user_metadata/)
  })

  it('pins search_path, is not security definer, and is not executable by anon', () => {
    expect(body).toContain("set search_path = ''")
    expect(body).not.toMatch(/security definer/i)
    expect(body).toContain('revoke all on function public.portal_owner_tenant_slug() from public, anon;')
  })
})

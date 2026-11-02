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

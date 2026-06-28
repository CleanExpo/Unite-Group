import { randomBytes } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadSupabaseAdminConfig, hasSupabaseAdminProvisioning } from './support/supabase-admin-config'

// Proves founder isolation at the DATABASE (RLS) layer, complementing the app-API
// isolation already covered by email-import.spec.ts. RLS policy under test:
// `crm_contacts.founder_id = auth.uid()`. A row owned by founder A must be invisible
// to founder B and to an anonymous client, while remaining visible to A — the positive
// control that keeps the zero-row assertions from passing vacuously.

type TestUser = { label: 'A' | 'B'; email: string; password: string; id?: string }

function safeMarker(marker: string) {
  return marker.replace(/[^a-zA-Z0-9]/g, '-')
}

function randomPassword() {
  return `${randomBytes(24).toString('base64url')}aA1!`
}

function makeAdminClient() {
  const cfg = loadSupabaseAdminConfig()
  return createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Anon-key client = the RLS-enforced surface a real browser session uses. NEVER the
// service-role key here — service role bypasses RLS and would pass this test vacuously.
function makeAnonClient(): SupabaseClient {
  const cfg = loadSupabaseAdminConfig()
  return createClient(cfg.url, cfg.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function provisionUser(admin: SupabaseClient, marker: string, user: TestUser) {
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { marker, purpose: 'playwright-rls-isolation', label: user.label },
  })
  if (error) throw new Error(`rls isolation createUser(${user.label}) failed: ${error.message}`)
  if (!data.user?.id) throw new Error(`rls isolation createUser(${user.label}) returned no id`)
  user.id = data.user.id
}

test.describe('RLS founder isolation — crm_contacts', () => {
  test.skip(
    !hasSupabaseAdminProvisioning().ok || !process.env.E2E_ALLOW_PROVISIONING,
    'requires a non-prod E2E backend with provisioning (E2E_ALLOW_PROVISIONING + E2E_SUPABASE_*) — not configured',
  )
  test.describe.configure({ mode: 'serial', timeout: 120_000 })

  test('a crm_contacts row owned by founder A is invisible to founder B and to anon, visible to A', async () => {
    const marker = new Date().toISOString()
    const safe = safeMarker(marker)
    const admin = makeAdminClient()
    const userA: TestUser = { label: 'A', email: `playwright+rls+${safe}+a@unite-hub.test`, password: randomPassword() }
    const userB: TestUser = { label: 'B', email: `playwright+rls+${safe}+b@unite-hub.test`, password: randomPassword() }
    let seededId: string | undefined

    try {
      await provisionUser(admin, marker, userA)
      await provisionUser(admin, marker, userB)

      // Seed a uniquely-marked row owned by A (service role bypasses RLS for setup only).
      const { data: seeded, error: seedErr } = await admin
        .from('crm_contacts')
        .insert({ founder_id: userA.id!, display_name: `__RLS__${safe}`, primary_email: `rls+${safe}@unite-hub.test` })
        .select('id')
        .single()
      expect(seedErr, JSON.stringify({ step: 'seed', error: seedErr })).toBeNull()
      seededId = seeded?.id as string | undefined
      expect(seededId, 'seed should return the new row id').toBeTruthy()

      // Positive control: founder A, through the RLS-enforced anon surface, CAN read own row.
      const aClient = makeAnonClient()
      const aSignIn = await aClient.auth.signInWithPassword({ email: userA.email, password: userA.password })
      expect(aSignIn.error, JSON.stringify({ step: 'A-signin', error: aSignIn.error })).toBeNull()
      const aRead = await aClient.from('crm_contacts').select('id').eq('id', seededId!)
      expect(aRead.error, JSON.stringify({ step: 'A-read', error: aRead.error })).toBeNull()
      expect(aRead.data ?? [], 'founder A must see their own row (else the breach test is vacuous)').toHaveLength(1)

      // Breach assertion: founder B, RLS-enforced, sees ZERO of A's rows.
      const bClient = makeAnonClient()
      const bSignIn = await bClient.auth.signInWithPassword({ email: userB.email, password: userB.password })
      expect(bSignIn.error, JSON.stringify({ step: 'B-signin', error: bSignIn.error })).toBeNull()
      const bByFounder = await bClient.from('crm_contacts').select('id').eq('founder_id', userA.id!)
      expect(bByFounder.error, JSON.stringify({ step: 'B-read-by-founder', error: bByFounder.error })).toBeNull()
      expect(bByFounder.data ?? [], 'RLS BREACH: founder B can read founder A rows by founder_id').toHaveLength(0)
      const bById = await bClient.from('crm_contacts').select('id').eq('id', seededId!)
      expect(bById.data ?? [], 'RLS BREACH: founder B can read founder A row by id').toHaveLength(0)

      // Anonymous (no session) sees ZERO.
      const anon = makeAnonClient()
      const anonRead = await anon.from('crm_contacts').select('id').eq('founder_id', userA.id!)
      expect(anonRead.data ?? [], 'RLS BREACH: anonymous client can read founder rows').toHaveLength(0)
    } finally {
      if (seededId) await admin.from('crm_contacts').delete().eq('id', seededId)
      for (const u of [userA, userB]) {
        if (u.id) {
          await admin.from('crm_contacts').delete().eq('founder_id', u.id)
          await admin.auth.admin.deleteUser(u.id).catch(() => undefined)
        }
      }
    }
  })
})

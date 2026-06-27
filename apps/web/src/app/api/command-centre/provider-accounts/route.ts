import { sanitiseError } from '@/lib/error-reporting'
import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { makeSupabaseStore, loadAccounts } from '@/lib/provider-pool/repository'
import { validateNewAccount } from '@/lib/provider-pool/registration'
import type { Json } from '@/types/database'

// Provider-account registration + live state. Founder-auth, founder-scoped.
// Lists accounts with their live router state (metadata only — never the key,
// which stays in the vault). POST registers a new account referencing a vault
// entry id. No secrets cross this boundary.
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = await createClient()
    const store = makeSupabaseStore(supabase)
    const now = new Date().toISOString()
    const [rows, states] = await Promise.all([store.listAccounts(user.id), loadAccounts(store, user.id, now)])
    const stateById = new Map(states.map((s) => [s.accountId, s]))

    const accounts = rows.map((r) => {
      const s = stateById.get(r.accountId)
      return {
        accountId: r.accountId,
        provider: r.provider,
        label: r.label,
        planKind: r.plan.kind,
        enabled: r.enabled,
        state: s?.state ?? 'unknown',
        usable: s ? s.configured && (s.state === 'available' || s.state === 'watching' || s.state === 'unknown') && !s.prepaidExhausted : false,
        prepaidExhausted: s?.prepaidExhausted ?? false,
        coolingUntil: s?.coolingUntil ?? null,
      }
    })

    return NextResponse.json(
      { source: 'cc:provider-accounts', generatedAt: now, total: accounts.length, accounts },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'list failed') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const validated = validateNewAccount(body)
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })

  try {
    const supabase = await createClient()
    // If a vault entry is referenced, it must belong to the founder (defence in
    // depth). An env-backed account (no vault entry) skips this — its key lives
    // in a Vercel env var resolved at call time.
    if (validated.value.vaultEntryId) {
      const { data: vaultEntry } = await supabase
        .from('credentials_vault')
        .select('id')
        .eq('founder_id', user.id)
        .eq('id', validated.value.vaultEntryId)
        .maybeSingle()
      if (!vaultEntry) return NextResponse.json({ error: 'vault entry not found for this founder' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('provider_accounts')
      .insert({
        founder_id: user.id,
        provider: validated.value.provider,
        label: validated.value.label,
        vault_entry_id: validated.value.vaultEntryId,
        enabled: true,
        plan: validated.value.plan as unknown as Json,
        allow_metered: validated.value.allowMetered,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: sanitiseError(error, 'create failed', { route: '/api/command-centre/provider-accounts' }) }, { status: 500 })

    return NextResponse.json({ ok: true, accountId: data?.id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'create failed') }, { status: 500 })
  }
}

// PATCH — enable/disable an account in the pool. Body: { accountId, enabled }.
// Founder-scoped via the store (UPDATE … WHERE id AND founder_id). Metadata only.
export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const v = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (typeof v.accountId !== 'string' || v.accountId.trim().length === 0) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }
  if (typeof v.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const store = makeSupabaseStore(supabase)
    await store.setAccountEnabled(user.id, v.accountId.trim(), v.enabled)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'update failed') }, { status: 500 })
  }
}

// DELETE — permanently remove an account. Body: { accountId }. Founder-scoped via
// the store (DELETE … WHERE id AND founder_id). The vault key (if any) is untouched.
export async function DELETE(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const v = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (typeof v.accountId !== 'string' || v.accountId.trim().length === 0) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const store = makeSupabaseStore(supabase)
    await store.removeAccount(user.id, v.accountId.trim())
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'delete failed') }, { status: 500 })
  }
}

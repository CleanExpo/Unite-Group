import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { makeSupabaseStore, loadAccounts } from '@/lib/provider-pool/repository'
import { executeChat } from '@/lib/provider-pool/execute'
import { resolveEnvKey } from '@/lib/provider-pool/credentials'

// "Test the pool" — sends a tiny prompt through the router to whichever provider
// wins the scout lane, proving the chain end-to-end (env key → route → provider
// → reply). Founder-auth. Logs the usage event like any real call. Keys resolve
// from env (the only path usable server-side; the vault is password-locked).
export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = await createClient()
    const store = makeSupabaseStore(supabase)
    const now = new Date().toISOString()
    const accounts = await loadAccounts(store, user.id, now)
    if (accounts.length === 0) {
      return NextResponse.json({ status: 'no_accounts', reason: 'register a provider account first' })
    }
    const providerByAccount = new Map(accounts.map((a) => [a.accountId, a.provider]))

    const result = await executeChat(
      'scout',
      { model: '', messages: [{ role: 'user', content: 'Reply with exactly the single word: PONG' }], maxTokens: 16 },
      {
        accounts,
        now,
        resolveKey: async (accountId) => {
          const provider = providerByAccount.get(accountId)
          return provider ? resolveEnvKey(provider, process.env) : null
        },
        logUsage: async (e) => {
          await store.insertEvent(user.id, {
            accountId: e.accountId,
            inputTokens: e.inputTokens,
            outputTokens: e.outputTokens,
            lane: e.lane,
            outcome: e.outcome,
            resetAt: e.resetAt ?? null,
          })
        },
      },
    )

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ status: 'error', reason: sanitiseError(err, 'test failed') }, { status: 500 })
  }
}

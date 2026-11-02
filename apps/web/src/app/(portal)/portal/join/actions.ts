'use server'

import { headers } from 'next/headers'

import { formatInviteCode, normaliseInviteCode } from '@/lib/portal/invites/code'
import { checkInviteForLink, linkClientAddress, linkClientKey, normaliseEmail, redeemInvite, type LinkCheck, type RedeemClient } from '@/lib/portal/invites/join'
import type { RedeemAppOutcome, RedeemOutcome } from '@/lib/portal/invites/outcomes'
import { createClient, getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// /portal/join is a public path (an invite holder may have no account yet). So every action here checks what it
// needs itself: the link request checks the code with the service role and a database rate limit; the redeem runs
// on the owner's own session, where the database refuses anything below a second-factor (aal2) session.

export type JoinLinkResult = { ok: true } | { ok: false; outcome: Exclude<LinkCheck, 'ok'> | 'bad_email' | 'error' }

export async function requestJoinLinkAction(rawCode: string, rawEmail: string): Promise<JoinLinkResult> {
  const email = normaliseEmail(rawEmail)
  if (!email) return { ok: false, outcome: 'bad_email' }
  const h = await headers()
  const clientKey = linkClientKey(linkClientAddress(h))
  let check: LinkCheck
  try {
    check = await checkInviteForLink(createServiceClient(), rawCode, email, clientKey)
  } catch {
    return { ok: false, outcome: 'error' }
  }
  if (check !== 'ok') return { ok: false, outcome: check }

  // The code is usable, so this link may create the owner's account (the founder sign-in never does).
  const code = formatInviteCode(normaliseInviteCode(rawCode) ?? '')
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || h.get('origin') || ''
  const callback = new URL('/api/auth/callback', base)
  callback.searchParams.set('next', `/portal/join?code=${encodeURIComponent(code)}`)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  })
  if (error) return { ok: false, outcome: 'error' }
  return { ok: true }
}

export async function redeemInviteAction(rawCode: string): Promise<RedeemOutcome | RedeemAppOutcome> {
  const user = await getUser()
  if (!user) return 'signed_out'
  try {
    return await redeemInvite((await createClient()) as unknown as RedeemClient, rawCode)
  } catch {
    return 'error'
  }
}

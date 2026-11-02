// What the page Stripe returns a client to may say (UNI-3173). Coming back from Stripe proves nothing, so "paid" is
// said only when the signed webhook has written the order. The answer carries no client or proposal details, because
// this page is reached without the proposal's link token.

import type { Admin } from './store'

export type ReturnState = 'cancelled' | 'confirmed' | 'confirming' | 'unavailable'

export async function returnStateFor(admin: Admin, sessionId: string | null): Promise<ReturnState> {
  if (!sessionId) return 'cancelled'
  const { data, error } = await admin
    .from('website_orders')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle<{ id: string }>()
  if (error) {
    console.error('[proposals] return page read failed:', error.message)
    return 'unavailable'
  }
  return data ? 'confirmed' : 'confirming'
}

// Reads a proposal for its public page and API routes (UNI-3173). A failed read comes back as 'unavailable', never
// as 'not_found': a database outage must not tell a client that their proposal does not exist.

import type { createServiceClient } from '@/lib/supabase/service'
import { isProposalToken, sha256Hex } from './tokens'

export type Admin = ReturnType<typeof createServiceClient>

export type ProposalRow = {
  id: string
  founder_id: string
  client_name: string
  client_business: string | null
  client_email: string
  plan_id: string
  plan_name: string
  scope: string[]
  amount_cents: number
  currency: string
  billing_interval: 'month' | null
  price_is_placeholder: boolean
  terms_version: string
  expires_at: string
  withdrawn_at: string | null
  stripe_session_id: string | null
}

export const PROPOSAL_COLUMNS =
  'id, founder_id, client_name, client_business, client_email, plan_id, plan_name, scope, amount_cents, currency, billing_interval, price_is_placeholder, terms_version, expires_at, withdrawn_at, stripe_session_id'

export type ProposalLookup =
  | { state: 'not_found' }
  | { state: 'unavailable' }
  | { state: 'withdrawn' | 'expired' | 'open'; proposal: ProposalRow }
  | { state: 'ordered'; proposal: ProposalRow; orderSource: 'paid' | 'comped' }

export async function lookupProposal(admin: Admin, token: string, now = new Date()): Promise<ProposalLookup> {
  if (!isProposalToken(token)) return { state: 'not_found' }

  const { data: proposal, error } = await admin
    .from('website_proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('token_hash', sha256Hex(token))
    .maybeSingle<ProposalRow>()
  if (error) {
    console.error('[proposals] proposal read failed:', error.message)
    return { state: 'unavailable' }
  }
  if (!proposal) return { state: 'not_found' }

  const { data: order, error: orderError } = await admin
    .from('website_orders')
    .select('source')
    .eq('founder_id', proposal.founder_id)
    .eq('proposal_id', proposal.id)
    .maybeSingle<{ source: 'paid' | 'comped' }>()
  if (orderError) {
    console.error('[proposals] order read failed:', orderError.message)
    return { state: 'unavailable' }
  }

  // An order outranks everything: it stays visible to the client even after the offer lapses.
  if (order) return { state: 'ordered', proposal, orderSource: order.source }
  if (proposal.withdrawn_at) return { state: 'withdrawn', proposal }
  if (new Date(proposal.expires_at) <= now) return { state: 'expired', proposal }
  return { state: 'open', proposal }
}

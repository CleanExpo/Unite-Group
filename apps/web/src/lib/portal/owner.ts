import { cache } from 'react'

import { createClient, getUser } from '@/lib/supabase/server'
import { isValidSlug } from '@/lib/card/slug'

// Who may open the business-owner portal at /portal.
//
// A business owner is a signed-in user who owns at least one living card, or who claimed a portal with an invite code.
// Both links to the auth user already exist, and row level security returns only the caller's own rows:
// - card_owners.founder_id (card_owners_founder_select: founder_id = auth.uid(); 20261024210000_card_enquiries_feedback.sql)
// - portal_tenant_members.user_id, written by portal_redeem_invite (portal_tenant_members_self_select: user_id = auth.uid();
//   20261102190000_portal_entitlements.sql)
// So both reads run on the owner's own signed-in client and no schema change is needed.
//
// Being a portal owner grants nothing outside /portal. The founder area and the founder APIs stay behind the founder
// allow-list in src/proxy.ts, unchanged.

export interface PortalUser {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

type Rows<Row> = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
export interface PortalOwnerClient {
  from(table: 'card_owners'): { select(columns: 'card_slug'): { eq(column: 'founder_id', value: string): Rows<{ card_slug: string }> } }
  from(table: 'portal_tenant_members'): {
    select(columns: 'tenant_slug'): { eq(column: 'user_id', value: string): Rows<{ tenant_slug: string }> }
  }
}

export type PortalAccess =
  | { status: 'anonymous' }
  | { status: 'owner'; userId: string; email: string | null; name: string | null; cardSlugs: string[]; tenantSlugs: string[] }
  | { status: 'not_owner'; email: string | null }
  // A failed read is its own state. It must never look like "you have no portal".
  | { status: 'error'; email: string | null }

function displayName(user: PortalUser): string | null {
  const full = user.user_metadata?.full_name
  if (typeof full === 'string' && full.trim()) return full.trim().split(/\s+/)[0] ?? null
  return null
}

// The same shape the invite tables enforce (portal_tenant_members.tenant_slug check).
const TENANT_SLUG = /^[a-z0-9-]{1,64}$/

/** Decides portal access for an already-resolved user. Pure apart from the two RLS-scoped reads. */
export async function resolvePortalAccess(user: PortalUser | null, client: PortalOwnerClient | null): Promise<PortalAccess> {
  if (!user?.id) return { status: 'anonymous' }
  const email = user.email ?? null
  if (!client) return { status: 'error', email }
  try {
    const [cards, tenants] = await Promise.all([
      client.from('card_owners').select('card_slug').eq('founder_id', user.id),
      client.from('portal_tenant_members').select('tenant_slug').eq('user_id', user.id),
    ])
    // Either read failing is an error: a half-answer must not decide "no portal".
    if (cards.error || !cards.data || tenants.error || !tenants.data) return { status: 'error', email }
    const cardSlugs = cards.data.map((row) => row.card_slug).filter(isValidSlug)
    const tenantSlugs = tenants.data.map((row) => row.tenant_slug).filter((slug) => TENANT_SLUG.test(slug))
    if (cardSlugs.length === 0 && tenantSlugs.length === 0) return { status: 'not_owner', email }
    return { status: 'owner', userId: user.id, email, name: displayName(user), cardSlugs, tenantSlugs }
  } catch {
    return { status: 'error', email }
  }
}

/**
 * The portal role check: links the signed-in auth user to their card_owners and portal_tenant_members rows.
 * Cached per request so the layout guard and the page share one read.
 */
export const getPortalOwner = cache(async function getPortalOwner(): Promise<PortalAccess> {
  const user = await getUser()
  if (!user) return { status: 'anonymous' }
  let client: PortalOwnerClient | null = null
  try {
    client = (await createClient()) as unknown as PortalOwnerClient
  } catch {
    client = null
  }
  return resolvePortalAccess(user, client)
})

export { PORTAL_LOGIN_URL, PORTAL_PATH } from './paths'

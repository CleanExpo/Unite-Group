import { cache } from 'react'

import { createClient, getUser } from '@/lib/supabase/server'
import { isValidSlug } from '@/lib/card/slug'

// Who may open the business-owner portal at /portal.
//
// A business owner is a signed-in user who owns at least one living card. The link from the auth user to the card
// already exists: card_owners.founder_id references auth.users(id), and row level security on card_owners
// (card_owners_founder_select: founder_id = auth.uid()) returns only the caller's own rows. So the read runs on the
// owner's own signed-in client and no schema change is needed (migration 20261024210000_card_enquiries_feedback.sql).
//
// Being a portal owner grants nothing outside /portal. The founder area and the founder APIs stay behind the founder
// allow-list in src/proxy.ts, unchanged.

export interface PortalUser {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

type Rows = PromiseLike<{ data: { card_slug: string }[] | null; error: { message: string } | null }>
export interface PortalOwnerClient {
  from(table: 'card_owners'): { select(columns: 'card_slug'): { eq(column: 'founder_id', value: string): Rows } }
}

export type PortalAccess =
  | { status: 'anonymous' }
  | { status: 'owner'; userId: string; email: string | null; name: string | null; cardSlugs: string[] }
  | { status: 'not_owner'; email: string | null }
  // A failed read is its own state. It must never look like "you have no portal".
  | { status: 'error'; email: string | null }

function displayName(user: PortalUser): string | null {
  const full = user.user_metadata?.full_name
  if (typeof full === 'string' && full.trim()) return full.trim().split(/\s+/)[0] ?? null
  return null
}

/** Decides portal access for an already-resolved user. Pure apart from the one RLS-scoped read. */
export async function resolvePortalAccess(user: PortalUser | null, client: PortalOwnerClient | null): Promise<PortalAccess> {
  if (!user?.id) return { status: 'anonymous' }
  const email = user.email ?? null
  if (!client) return { status: 'error', email }
  try {
    const { data, error } = await client.from('card_owners').select('card_slug').eq('founder_id', user.id)
    if (error || !data) return { status: 'error', email }
    const cardSlugs = data.map((row) => row.card_slug).filter(isValidSlug)
    if (cardSlugs.length === 0) return { status: 'not_owner', email }
    return { status: 'owner', userId: user.id, email, name: displayName(user), cardSlugs }
  } catch {
    return { status: 'error', email }
  }
}

/**
 * The portal role check: links the signed-in auth user to their card_owners rows.
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

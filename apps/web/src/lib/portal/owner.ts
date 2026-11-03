import 'server-only'

import { createClient } from '@/lib/supabase/server'

import type { Aal, PortalOwner } from './changes/types'
import { readEntitlements, type EntitlementsReadClient } from './entitlements/get-entitlements'

// THE portal owner check (UNI-3174, UNI-3168, UNI-3167). /portal, /portal/changes, /portal/setup and every portal
// server action ask this one function, and the database row rules ask public.portal_owner_tenant_slug(), which reads
// the same thing: the caller's own portal_tenant_members row. That row is written only by the invite redeem
// (portal_redeem_invite) or by service_role, never by the owner, so a signed-in user cannot claim another tenant.
//
// One tenant per owner: if a user belongs to more than one tenant, the oldest membership wins (created_at, then
// tenant_slug), exactly as the SQL helper picks it, so the pages and the row rules never disagree.
// The plan comes from S2's portal_entitlements, read on the owner's own session (row rules: aal2 only).

const TENANT_SLUG = /^[a-z0-9-]{1,64}$/

type Read<T> = PromiseLike<{ data: T; error: { message: string } | null }>

export type OwnerReadClient = EntitlementsReadClient & {
  auth: {
    getUser(): PromiseLike<{ data: { user: { id: string } | null } | null }>
    mfa: { getAuthenticatorAssuranceLevel(): PromiseLike<{ data: { currentLevel: string | null } | null }> }
  }
  from(table: 'portal_tenant_members'): {
    select(columns: 'tenant_slug'): {
      eq(column: 'user_id', value: string): {
        order(column: 'created_at', options: { ascending: boolean }): {
          order(column: 'tenant_slug', options: { ascending: boolean }): {
            limit(count: 1): Read<{ tenant_slug: unknown }[] | null>
          }
        }
      }
    }
  }
}

/**
 * Signed out, or signed in with no membership: null (not an owner). A member on the emailed link only (aal1) is an
 * owner with aal1, so the page says "confirm it is you" instead of "no portal". A failed membership or entitlements
 * read throws: it must never look like "you have no portal".
 */
export async function readPortalOwner(client: OwnerReadClient): Promise<PortalOwner | null> {
  const { data: userData } = await client.auth.getUser()
  const user = userData?.user ?? null
  if (!user?.id) return null

  const { data: rows, error } = await client.from('portal_tenant_members').select('tenant_slug').eq('user_id', user.id)
    .order('created_at', { ascending: true }).order('tenant_slug', { ascending: true }).limit(1)
  if (error) throw new Error(`portal membership read failed: ${error.message}`)
  const slug = rows?.[0]?.tenant_slug
  if (typeof slug !== 'string' || !TENANT_SLUG.test(slug)) return null

  const { data: aalData } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  const aal: Aal = aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1'
  // aal1 is never access and the entitlements row rule hides the row below aal2, so it is only read at aal2.
  const plan = aal === 'aal2' ? (await readEntitlements(client, slug)).plan : 'none'
  return { userId: user.id, ownerId: user.id, tenantSlug: slug, plan, aal }
}

export async function getPortalOwner(): Promise<PortalOwner | null> {
  return readPortalOwner((await createClient()) as unknown as OwnerReadClient)
}

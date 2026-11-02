import 'server-only'

import { createClient } from '@/lib/supabase/server'

import type { Aal, Entitlements, PortalOwner, PortalPlan } from './types'

// SWAP: replace with S1 getPortalOwner (branch feat/portal-foundation) once it is on main.
// SWAP: replace getEntitlements with S2 getEntitlements (branch feat/uni-3167-portal-invite-comp-plan) once it is on main.
//
// Until then this stub reads the signed-in Supabase session. The tenant comes ONLY from app_metadata.portal_tenant_slug:
// users cannot edit app_metadata (Supabase docs, Row Level Security guide), so a signed-in user cannot claim another
// tenant. The database helper public.portal_owner_tenant_slug() reads the same claim, so the page and the row rules
// agree. When S1 lands, both this file and that helper are the two swap points.

const TENANT_SLUG = /^[a-z0-9-]{1,64}$/
const PLANS: readonly PortalPlan[] = ['comp', 'paid', 'none']

type SessionUser = { id: string; app_metadata?: Record<string, unknown> | null }

/** Pure: build the owner from a session. No tenant claim, or a malformed one, means not an owner. */
export function ownerFromSession(user: SessionUser | null, currentLevel: string | null | undefined): PortalOwner | null {
  if (!user?.id) return null
  const slug = user.app_metadata?.portal_tenant_slug
  if (typeof slug !== 'string' || !TENANT_SLUG.test(slug)) return null
  const rawPlan = user.app_metadata?.portal_plan
  const plan: PortalPlan = PLANS.includes(rawPlan as PortalPlan) ? (rawPlan as PortalPlan) : 'none'
  const aal: Aal = currentLevel === 'aal2' ? 'aal2' : 'aal1'
  return { userId: user.id, ownerId: user.id, tenantSlug: slug, plan, aal }
}

export async function getPortalOwner(): Promise<PortalOwner | null> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user ?? null
  if (!user) return null
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return ownerFromSession(user, aalData?.currentLevel ?? null)
}

/** Stub: no module is switched on until S2 provides the real entitlements. Fails closed. */
export async function getEntitlements(tenantSlug: string): Promise<Entitlements> {
  void tenantSlug
  return { plan: 'none', modules: { content: false, seo: false, social: false, voice: false } }
}

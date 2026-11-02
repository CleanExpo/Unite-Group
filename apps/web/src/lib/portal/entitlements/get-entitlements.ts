import { createClient } from '@/lib/supabase/server'

import { noEntitlements, normaliseEntitlements, type Entitlements } from './types'

export type EntitlementsReadClient = {
  from(table: 'portal_entitlements'): {
    select(columns: 'plan, modules'): {
      eq(column: 'tenant_slug', value: string): {
        maybeSingle(): PromiseLike<{ data: { plan: unknown; modules: unknown } | null; error: { message: string } | null }>
      }
    }
  }
}

/**
 * Reads one tenant's entitlements on the caller's own session, so row level security decides:
 * only an owner of that tenant on a second-factor (aal2) session sees the row.
 * No row (or not allowed to see it) reads as plan 'none' with every module OFF.
 * A failed read throws. It never looks like an empty answer.
 */
export async function readEntitlements(client: EntitlementsReadClient, tenantSlug: string): Promise<Entitlements> {
  const { data, error } = await client.from('portal_entitlements').select('plan, modules').eq('tenant_slug', tenantSlug).maybeSingle()
  if (error) throw new Error(`portal entitlements read failed: ${error.message}`)
  return data ? normaliseEntitlements(data) : noEntitlements()
}

/** S2 contract: getEntitlements(tenantSlug) for the signed-in caller. Server-side only. */
export async function getEntitlements(tenantSlug: string): Promise<Entitlements> {
  const client = (await createClient()) as unknown as EntitlementsReadClient
  return readEntitlements(client, tenantSlug)
}

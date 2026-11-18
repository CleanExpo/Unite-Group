import 'server-only'

import { createClient } from '@/lib/supabase/server'

import { decidePortalAccess, type PortalAccess } from '../changes/access'
import { getPortalOwner } from '../owner'

import type { PortalProjectsDb } from './service'

/**
 * Who is asking, and a database client that carries HER session so the row rules apply. Never the service-role
 * client. The generated types do not know the project tables yet (the migration is a file only), so the client is
 * narrowed to the structural slice the service uses.
 */
export async function portalProjectsContext(): Promise<{ access: PortalAccess; db: PortalProjectsDb }> {
  const access = decidePortalAccess(await getPortalOwner())
  const supabase = await createClient()
  return { access, db: supabase as unknown as PortalProjectsDb }
}

import 'server-only'

import { createClient } from '@/lib/supabase/server'

import type { PortalSetupDb } from '../setup/service'

import { decidePortalAccess, type PortalAccess } from './access'
import { getPortalOwner } from '../owner'
import type { PortalChangesDb } from './service'

/**
 * One call for every portal page and server action: who is asking, and a database client that carries HER session,
 * so the row rules apply. Never the service-role client. The generated database types do not know these tables yet
 * (migrations are files only), so the client is narrowed to the structural slice the services use.
 */
export async function portalContext(): Promise<{ access: PortalAccess; db: PortalChangesDb & PortalSetupDb }> {
  const access = decidePortalAccess(await getPortalOwner())
  const supabase = await createClient()
  return { access, db: supabase as unknown as PortalChangesDb & PortalSetupDb }
}

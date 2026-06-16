// GET /api/command-centre/project-integrations
// Founder-auth, read-only rollup of metadata-only project integration manifests.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const projects = await getProjects()
    const integrations = await loadProjectIntegrationStatuses(projects)
    return NextResponse.json({
      source: 'command-centre:project-integrations',
      count: integrations.length,
      integrations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load project integrations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

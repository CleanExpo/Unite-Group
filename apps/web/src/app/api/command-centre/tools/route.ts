// GET /api/command-centre/tools - read-only tool-catalogue discovery (list-only).
// Auth-gated by the existing Supabase session pattern; unauthenticated -> 401.
// This endpoint NEVER invokes a tool — it only lists discovered sources.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getFounderToolCatalogue } from '@/lib/command-centre/tools/catalogue'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    // Registry-first: serve `cc_tools` when it has rows, otherwise the static
    // set. `origin` says which — a static catalogue must never be mistaken for
    // a populated registry. `POST /api/command-centre/registry/sync` fills it.
    const { tools, origin, registry_count } = await getFounderToolCatalogue(user.id)
    return NextResponse.json({ tools, count: tools.length, origin, registry_count })
  } catch (error) {
    const message = sanitiseError(error, 'Failed to load tool catalogue')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/nexus/branches
// Creates a feature branch in the correct portfolio repo for a routed work item.
// Body: { repoId: string, title: string }  (repoId is the ticket id, e.g. UNI-2203)
// Returns: { branch, repo, url }  — UNI-2203, parent UNI-2183.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createWorkBranch } from '@/lib/nexus/branch-orchestrator'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { repoId?: unknown; title?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const repoId = typeof body.repoId === 'string' ? body.repoId.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (!repoId || !title) {
    return NextResponse.json(
      { error: 'repoId and title are required' },
      { status: 400 },
    )
  }

  try {
    const result = await createWorkBranch(repoId, title)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Branch creation failed') },
      { status: 500 },
    )
  }
}

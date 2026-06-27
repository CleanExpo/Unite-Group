// POST /api/nexus/prs/approve
// Merges a PR via GitHub API (squash merge).
// Body: { owner: string, repo: string, number: number }

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { mergePR } from '@/lib/nexus/github-prs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { owner?: unknown; repo?: unknown; number?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const owner = typeof body.owner === 'string' ? body.owner.trim() : ''
  const repo = typeof body.repo === 'string' ? body.repo.trim() : ''
  const number = typeof body.number === 'number' ? body.number : 0

  if (!owner || !repo || !number) {
    return NextResponse.json(
      { error: 'owner, repo, and number are required' },
      { status: 400 },
    )
  }

  try {
    await mergePR(owner, repo, number)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Merge failed') },
      { status: 500 },
    )
  }
}

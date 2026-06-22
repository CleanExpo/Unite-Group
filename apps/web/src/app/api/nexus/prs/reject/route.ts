// POST /api/nexus/prs/reject
// Closes a PR and posts a rejection comment with the founder's reason.
// Body: { owner: string, repo: string, number: number, reason?: string }

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { closePR } from '@/lib/nexus/github-prs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { owner?: unknown; repo?: unknown; number?: unknown; reason?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const owner = typeof body.owner === 'string' ? body.owner.trim() : ''
  const repo = typeof body.repo === 'string' ? body.repo.trim() : ''
  const number = typeof body.number === 'number' ? body.number : 0
  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : 'Rejected by founder'

  if (!owner || !repo || !number) {
    return NextResponse.json(
      { error: 'owner, repo, and number are required' },
      { status: 400 },
    )
  }

  try {
    await closePR(owner, repo, number, reason)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reject failed' },
      { status: 500 },
    )
  }
}

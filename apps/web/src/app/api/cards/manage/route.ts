// POST /api/cards/manage — card owner and staff edits (UNI-3146).
//
// PUBLIC route (exact path allow-listed in src/proxy.ts, rate-limited there). Card buyers have no sign-in, so the private
// link's token in the body is the authority. Every permission check is server-side in src/lib/card/staff-actions.ts.
// An unknown token, a malformed token and a deactivated card's old token all get the same 404. Never cached.

import { NextRequest, NextResponse } from 'next/server'

import { handleCardManage } from '@/lib/card/staff-actions'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE })
  }
  const result = await handleCardManage(createServiceClient(), body as Record<string, unknown>)
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE })
}

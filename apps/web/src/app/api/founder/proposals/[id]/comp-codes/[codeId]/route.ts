// PATCH /api/founder/proposals/[id]/comp-codes/[codeId]: revoke a comp code so it can no longer be redeemed (UNI-3173).

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sanitiseError } from '@/lib/error-reporting'
import { requireFounder } from '@/lib/proposals/founder-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const uuid = z.string().uuid()

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string; codeId: string }> }) {
  const auth = await requireFounder()
  if ('denied' in auth) return auth.denied

  const { id, codeId } = await params
  if (!uuid.safeParse(id).success || !uuid.safeParse(codeId).success) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await createServiceClient()
    .from('website_comp_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('founder_id', auth.founderId)
    .eq('proposal_id', id)
    .eq('id', codeId)
    .is('revoked_at', null)
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not revoke the code') }, { status: 500 })
  return NextResponse.json({ revoked: true })
}

// PATCH /api/founder/proposals/[id]: withdraw a proposal so its link stops accepting (UNI-3173). An order already
// placed is untouched. Withdrawing twice keeps the first time.

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sanitiseError } from '@/lib/error-reporting'
import { requireFounder } from '@/lib/proposals/founder-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFounder()
  if ('denied' in auth) return auth.denied

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await createServiceClient()
    .from('website_proposals')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('founder_id', auth.founderId)
    .eq('id', id)
    .is('withdrawn_at', null)
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not withdraw the proposal') }, { status: 500 })
  return NextResponse.json({ withdrawn: true })
}

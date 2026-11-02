// POST /api/founder/proposals/[id]/comp-codes: make a single-use comp code for one proposal (UNI-3173), optionally
// tied to an email. The code is returned once and only its hash is kept. Nothing is sent to the client.

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sanitiseError } from '@/lib/error-reporting'
import { requireFounder } from '@/lib/proposals/founder-auth'
import { hashCompCode, newCompCode } from '@/lib/proposals/tokens'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  boundEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFounder()
  if ('denied' in auth) return auth.denied

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'That email does not look right' }, { status: 400 })

  const admin = createServiceClient()
  const { data: proposal, error: readError } = await admin
    .from('website_proposals')
    .select('id')
    .eq('founder_id', auth.founderId)
    .eq('id', id)
    .maybeSingle<{ id: string }>()
  if (readError) return NextResponse.json({ error: sanitiseError(readError, 'Could not read the proposal') }, { status: 500 })
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const code = newCompCode()
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString()
  const { data: created, error } = await admin
    .from('website_comp_codes')
    .insert({
      founder_id: auth.founderId,
      proposal_id: proposal.id,
      code_hash: hashCompCode(code),
      bound_email: parsed.data.boundEmail ?? null,
      expires_at: expiresAt,
    })
    .select('id')
    .single<{ id: string }>()
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not create the code') }, { status: 500 })

  return NextResponse.json({ id: created.id, code, expiresAt }, { status: 201 })
}

// src/app/api/bookkeeper/transactions/[id]/approve/route.ts
import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookkeeper_transactions')
    .update({
      reconciliation_status: 'reconciled',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('founder_id', user.id)

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to approve transaction', { route: '/api/bookkeeper/transactions/[id]/approve' }) }, { status: 500 })

  return NextResponse.json({ success: true })
}

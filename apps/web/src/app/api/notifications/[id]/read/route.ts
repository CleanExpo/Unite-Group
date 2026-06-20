import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id } = await params

  const supabase = await createClient()

  const { error } = await supabase
    .from('founder_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('founder_id', user.id)

  if (error) {
    console.error('[PATCH /api/notifications/:id/read]', error.message)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import { sanitiseError } from '@/lib/error-reporting'
import { NextRequest, NextResponse } from 'next/server'
import { runBookkeeperDryRun } from '@/lib/bookkeeper/dry-run'
import { getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const businessKey = request.nextUrl.searchParams.get('business') ?? undefined

  try {
    const result = await runBookkeeperDryRun(user.id, businessKey)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Unknown dry-run error') },
      { status: 500 },
    )
  }
}

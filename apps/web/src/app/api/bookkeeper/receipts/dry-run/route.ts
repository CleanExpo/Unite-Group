import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isOwnedBusinessKey } from '@/lib/businesses'
import { scanReceiptCandidatesDryRun } from '@/lib/bookkeeper/receipts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessKey = searchParams.get('business') ?? undefined
  const accountEmail = searchParams.get('email') ?? undefined
  const maxThreads = Number.parseInt(searchParams.get('maxThreads') ?? '10', 10)

  if (businessKey && !isOwnedBusinessKey(businessKey)) {
    return NextResponse.json(
      { error: `Receipt scanning is restricted to owned businesses. '${businessKey}' is not owned.` },
      { status: 400 },
    )
  }

  const result = await scanReceiptCandidatesDryRun(user.id, createServiceClient(), {
    businessKey,
    accountEmail,
    maxThreadsPerAccount: Number.isFinite(maxThreads) ? Math.min(Math.max(maxThreads, 1), 25) : 10,
  })

  return NextResponse.json({
    success: true,
    dryRun: true,
    writes: 0,
    xeroMutations: 0,
    ...result,
  })
}

// POST /api/settings/integrations/disconnect
// Founder-scoped disconnect of a single connected email mailbox. Body:
// { service: 'google' | 'microsoft', email: string }. Removes only the one
// credentials_vault row for founder_id + service + email, leaving every other
// connected account untouched (multi-account safe).

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  disconnectEmailAccount,
  type EmailIntegrationService,
} from '@/lib/integrations/disconnect-email-account'

export const dynamic = 'force-dynamic'

const VALID_SERVICES: EmailIntegrationService[] = ['google', 'microsoft']

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { service?: string; email?: string }
  try {
    body = (await request.json()) as { service?: string; email?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const service = body.service
  const email = body.email?.trim()

  if (!service || !VALID_SERVICES.includes(service as EmailIntegrationService)) {
    return NextResponse.json({ error: 'service must be "google" or "microsoft"' }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  try {
    await disconnectEmailAccount(user.id, service as EmailIntegrationService, email)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[settings/integrations/disconnect] error:', err)
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
  }
}

// src/app/api/email/draft-reply/route.ts
// POST /api/email/draft-reply
// Body: { account, threadId }
// On-demand, founder-initiated founder-voice draft for the reply composer.
// Produces a draft body ONLY — never stores, never sends, never gated behind
// MARGOT_DRAFTS_ENABLED (that flag governs autonomous drafting, not this).

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { fetchFullThread } from '@/lib/integrations/google'
import { getAccountVoice } from '@/lib/margot/account-voice'
import { generateFounderDraft } from '@/lib/margot/draft-reply'
import { createAnthropicComplete } from '@/lib/margot/providers'
import type { IncomingEmail } from '@/lib/margot/draft-reply-prompt'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { account, threadId } = await request.json() as {
    account?: string
    threadId?: string
  }
  if (!account) return NextResponse.json({ error: 'account required' }, { status: 400 })
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  try {
    const [voice, thread] = await Promise.all([
      getAccountVoice(user.id, account),
      fetchFullThread(user.id, account, threadId),
    ])

    const last = thread.messages[thread.messages.length - 1]
    if (!last) {
      return NextResponse.json({ error: 'Thread has no messages to reply to' }, { status: 400 })
    }

    const incoming: IncomingEmail = {
      from: last.from,
      subject: thread.subject,
      body: last.bodyText ?? last.bodyHtml ?? '',
    }

    const body = await generateFounderDraft(incoming, voice, createAnthropicComplete())
    return NextResponse.json({ body })
  } catch (error) {
    console.error('[Email API] draft-reply failed:', error)
    return NextResponse.json(
      { error: sanitiseError(error, 'Draft failed') },
      { status: 500 }
    )
  }
}

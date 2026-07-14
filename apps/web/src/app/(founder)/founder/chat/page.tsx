// src/app/(founder)/founder/chat/page.tsx
//
// Founder chat — talk to the estate's agent (the Nexus operator assistant)
// directly from the CRM, without Telegram. Server component: authenticates,
// loads the founder's businesses for optional grounding, and hands the thread
// to the client. Session lives in page state only — no tables, no DDL.

export const dynamic = 'force-dynamic'

import { getUser, createClient } from '@/lib/supabase/server'
import { ChatClient, type ChatBusiness } from './ChatClient'

export default async function FounderChatPage() {
  const user = await getUser()

  let businesses: ChatBusiness[] = []
  let businessLoadError: string | null = null
  if (user) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('founder_id', user.id)
      .order('name')
    if (error) {
      // Honest degradation: chat still works, grounding selector reports why
      // it is empty instead of silently hiding businesses.
      businessLoadError = error.message
    }
    businesses = (data ?? [])
      .filter((b) => typeof b.slug === 'string' && b.slug.length > 0)
      .map((b) => ({ slug: b.slug as string, name: b.name ?? (b.slug as string) }))
  }

  return (
    <ChatClient
      businesses={businesses}
      businessLoadError={businessLoadError}
      signedIn={Boolean(user)}
    />
  )
}

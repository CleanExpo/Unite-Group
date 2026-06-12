export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { KnowledgeConsoleClient } from '@/components/founder/knowledge-console/KnowledgeConsoleClient'

export default async function KnowledgeConsolePage() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <KnowledgeConsoleClient />
}


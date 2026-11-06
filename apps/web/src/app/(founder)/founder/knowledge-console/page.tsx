import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { KnowledgeConsoleClient } from '@/founder/knowledge-console/KnowledgeConsoleClient'

export const metadata = noIndexPageMetadata({
  path: "/founder/knowledge-console",
  title: "Knowledge Console | Unite Group",
  description: "Private founder workspace: Knowledge Console.",
})
export default async function KnowledgeConsolePage() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <KnowledgeConsoleClient />
}


import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getVaultFiles } from '@/lib/integrations/google-drive'
import { NotesPageClient } from '@/founder/notes/NotesPageClient'

export const metadata = noIndexPageMetadata({
  path: "/founder/notes",
  title: "Notes | Unite Group",
  description: "Private founder workspace: Notes.",
})
export default async function NotesPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const files = await getVaultFiles(user.id)

  return <NotesPageClient files={files} />
}

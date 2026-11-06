import { redirect } from 'next/navigation'
import { noIndexPageMetadata } from '@/lib/page-metadata'


export const metadata = noIndexPageMetadata({
  path: "/founder/workspace",
  title: "Workspace | Unite Group",
  description: "Private founder workspace: Workspace.",
})
export default function LegacyWorkspaceRedirectPage() {
  redirect('/founder/command-centre')
}

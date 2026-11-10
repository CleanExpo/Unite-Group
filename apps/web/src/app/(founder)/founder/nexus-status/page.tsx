import { redirect } from 'next/navigation'
import { noIndexPageMetadata } from '@/lib/page-metadata'


export const dynamic = 'force-dynamic'

// Deprecated draft stub (was "No data yet" placeholder sections). Consolidated
// into the canonical command centre per the operating-readiness dedupe (B7).
// Kept as a redirect so any existing links/bookmarks land on the live surface.
export const metadata = noIndexPageMetadata({
  path: "/founder/nexus-status",
  title: "Nexus Status | Unite Group",
  description: "Private founder workspace: Nexus Status.",
})
export default function NexusStatusPage(): never {
  redirect('/founder/command-centre')
}

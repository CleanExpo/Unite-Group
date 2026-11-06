import { redirect } from 'next/navigation'
import { noIndexPageMetadata } from '@/lib/page-metadata'


export const dynamic = 'force-dynamic'

// Retired surface (UNI-2306). Every dashboard widget was consolidated into the
// canonical command deck (Founder Cockpit section) so the deck is the one
// canonical console. Kept as a redirect so existing links/bookmarks and the
// post-login landing still resolve to the live surface — mirrors the
// nexus-status dedupe precedent.
export const metadata = noIndexPageMetadata({
  path: "/founder/dashboard",
  title: "Dashboard | Unite Group",
  description: "Private founder workspace: Dashboard.",
})
export default function DashboardPage(): never {
  redirect('/founder/command-centre')
}

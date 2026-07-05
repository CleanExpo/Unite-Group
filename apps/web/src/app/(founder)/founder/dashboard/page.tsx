import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Retired surface (UNI-2306). Every dashboard widget was consolidated into the
// canonical command deck (Founder Cockpit section) so the deck is the one
// canonical console. Kept as a redirect so existing links/bookmarks and the
// post-login landing still resolve to the live surface — mirrors the
// nexus-status dedupe precedent.
export default function DashboardPage(): never {
  redirect('/founder/command-centre')
}

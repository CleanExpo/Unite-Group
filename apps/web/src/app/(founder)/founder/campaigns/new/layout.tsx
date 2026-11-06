import type { Metadata } from 'next'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/founder/campaigns/new',
  title: 'New campaign | Unite Group',
  description: 'Create a campaign from brand DNA and generated assets.',
})

export default function NewCampaignLayout({ children }: { children: React.ReactNode }) {
  return children
}

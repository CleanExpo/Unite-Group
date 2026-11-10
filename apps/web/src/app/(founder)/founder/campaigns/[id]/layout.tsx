import type { Metadata } from 'next'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  title: 'Campaign | Unite Group',
  description: 'Campaign detail and assets.',
  canonical: null,
})

export default function CampaignDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}

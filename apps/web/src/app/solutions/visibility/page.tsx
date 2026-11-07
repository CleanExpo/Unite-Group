import type { Metadata } from 'next'

import { PillarPage } from '@/public/pillar/pillar-page'
import { publicPageMetadata } from '@/lib/page-metadata'
import { PILLARS, pillarPath } from '@/lib/public-site'

const pillar = PILLARS.find((p) => p.slug === 'visibility')!

export const metadata: Metadata = publicPageMetadata({
  path: pillarPath(pillar.slug),
  title: pillar.seoTitle,
  description: pillar.seoDescription,
  openGraphTitle: `${pillar.name} | Unite Group`,
  openGraphDescription: pillar.intro,
})

export default function VisibilityPage() {
  return <PillarPage slug="visibility" />
}

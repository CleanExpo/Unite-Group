import type { Metadata } from 'next'

import { PillarPage } from '@/public/pillar/pillar-page'
import { publicPageMetadata } from '@/lib/page-metadata'
import { PILLARS, pillarPath } from '@/lib/public-site'

const pillar = PILLARS.find((p) => p.slug === 'experience')!

export const metadata: Metadata = publicPageMetadata({
  path: pillarPath(pillar.slug),
  title: `${pillar.name} | Unite Group`,
  description: pillar.intro,
})

export default function ExperiencePage() {
  return <PillarPage slug="experience" />
}

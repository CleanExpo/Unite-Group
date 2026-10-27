import type { Metadata } from 'next'

import { PillarPage } from '@/public/pillar/pillar-page'
import { PILLARS, SITE_URL, pillarPath } from '@/lib/public-site'

const pillar = PILLARS.find((p) => p.slug === 'conversion')!

export const metadata: Metadata = {
  title: `${pillar.name} | Unite Group`,
  description: pillar.intro,
  alternates: { canonical: `${SITE_URL}${pillarPath(pillar.slug)}` },
  robots: { index: true, follow: true },
}

export default function ConversionPage() {
  return <PillarPage slug="conversion" />
}

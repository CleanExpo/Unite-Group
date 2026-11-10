import type { Metadata } from 'next'

import { noIndexPageMetadata } from '@/lib/page-metadata'

/** Shared defaults for every route under /founder (CRM). Child pages may override `title` / `description`. */
export const FOUNDER_AREA_METADATA: Metadata = noIndexPageMetadata({
  title: 'Founder workspace | Unite Group',
  description: 'Private Mission Control workspace for Unite Group.',
  canonical: null,
})

import type { MetadataRoute } from 'next'

import { PUBLIC_ROUTES, SITE_URL, type PublicRoute } from '@/lib/public-site'

type Freq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

// Last content change per route (git log -1 on the page source), fixed in code: never "now".
// Update the date when a page's copy changes. The Record forces an entry for every new route.
const ROUTES: Record<PublicRoute, { lastModified: string; priority: number; changeFrequency: Freq }> = {
  '/': { lastModified: '2026-10-25', priority: 1, changeFrequency: 'monthly' },
  '/cards': { lastModified: '2026-10-25', priority: 0.9, changeFrequency: 'monthly' },
  '/cards/order': { lastModified: '2026-10-25', priority: 0.8, changeFrequency: 'monthly' },
  '/solutions/conversion': { lastModified: '2026-10-25', priority: 0.7, changeFrequency: 'monthly' },
  '/solutions/visibility': { lastModified: '2026-10-25', priority: 0.6, changeFrequency: 'monthly' },
  '/solutions/experience': { lastModified: '2026-10-25', priority: 0.6, changeFrequency: 'monthly' },
  '/solutions/intelligence': { lastModified: '2026-10-25', priority: 0.6, changeFrequency: 'monthly' },
  '/cards/terms': { lastModified: '2026-10-25', priority: 0.3, changeFrequency: 'monthly' },
  '/privacy-policy': { lastModified: '2026-10-25', priority: 0.2, changeFrequency: 'yearly' },
  '/terms-of-service': { lastModified: '2026-10-25', priority: 0.2, changeFrequency: 'yearly' },
}

// Every public route and nothing private. /auth/*, /docs, /founder/* and /api/* are deliberately absent.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`,
    ...ROUTES[route],
  }))
}

import type { MetadataRoute } from 'next'

import { PUBLIC_ROUTES, SITE_URL } from '@/lib/public-site'

// Every public route and nothing private. /auth/*, /docs, /founder/* and /api/* are deliberately absent.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`,
    changeFrequency: route === '/privacy-policy' || route === '/terms-of-service' ? 'yearly' : 'monthly',
    priority: route === '/' ? 1 : route.startsWith('/solutions/') ? 0.6 : 0.5,
  }))
}

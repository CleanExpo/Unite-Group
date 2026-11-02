import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/public-site'

// robots.txt is advisory: it asks well-behaved crawlers, it does not control access. The real gate is
// src/proxy.ts. Private paths are disallowed for everyone.
// Policy (spec A-CRAWL, founder decision, Phill, 02/11/2026: "Yes, allow AI assistants on unite-group.in
// via a reviewed PR"): the named AI assistants and their search and training crawlers may read the public
// paths, /cards included. Crawlers not named there stay blocked.
export const PRIVATE_PATHS = ['/founder/', '/api/', '/docs', '/auth/'] as const

export const AI_ASSISTANT_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'Claude-Web',
  'Google-Extended',
  'PerplexityBot',
  'Perplexity-User',
] as const

export const BLOCKED_CRAWLERS = ['CCBot', 'anthropic-ai', 'Applebot-Extended', 'Bytespider'] as const

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [...PRIVATE_PATHS] },
      { userAgent: [...AI_ASSISTANT_CRAWLERS], allow: '/', disallow: [...PRIVATE_PATHS] },
      { userAgent: [...BLOCKED_CRAWLERS], disallow: '/' },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/video-sitemap.xml`],
  }
}

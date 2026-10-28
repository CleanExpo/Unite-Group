import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/public-site'

// robots.txt is advisory: it asks well-behaved crawlers, it does not control access. The real gate is
// src/proxy.ts. Private paths are disallowed for everyone.
// Policy (spec A-CRAWL, a card default): fetchers that act for a person who asked (ChatGPT-User,
// Claude-User, Claude-Web, Perplexity-User) may read the public paths. Crawlers that gather training
// data stay blocked.
export const PRIVATE_PATHS = ['/founder/', '/api/', '/docs', '/auth/'] as const

export const USER_TRIGGERED_FETCHERS = ['ChatGPT-User', 'Claude-User', 'Claude-Web', 'Perplexity-User'] as const

export const TRAINING_CRAWLERS = ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider'] as const

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [...PRIVATE_PATHS] },
      { userAgent: [...USER_TRIGGERED_FETCHERS], allow: '/', disallow: [...PRIVATE_PATHS] },
      { userAgent: [...TRAINING_CRAWLERS], disallow: '/' },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/video-sitemap.xml`],
  }
}

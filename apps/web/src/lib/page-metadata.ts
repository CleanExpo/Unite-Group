import type { Metadata } from 'next'

import { SITE_URL } from '@/lib/public-site'

/** Known marketing URLs (sitemap); also use for documentation / autocomplete at call sites. */
export type MarketingPath =
  | '/'
  | '/cards'
  | '/cards/order'
  | '/cards/terms'
  | '/video/ten-clips'
  | '/get-a-website'
  | '/bots'
  | '/pricing'
  | '/signatures'
  | '/solutions/visibility'
  | '/solutions/experience'
  | '/solutions/conversion'
  | '/solutions/intelligence'
  | '/privacy-policy'
  | '/terms-of-service'
  /** Public SMB offer; page metadata uses `robots: noindex`. */
  | '/grow'

export type IndexedPageMetadataOptions = {
  /** Full document title; usually ends with `| Unite Group`. */
  title: string
  description: string
  /** Site path starting with `/` (marketing routes, `/c/slug` for owner cards, etc.). */
  path: MarketingPath | (string & {})
  robots?: Metadata['robots']
  openGraphTitle?: string
  openGraphDescription?: string
}

function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return p === '/' ? SITE_URL : `${SITE_URL}${p}`
}

/**
 * Indexed public routes: canonical, Open Graph, Twitter (e.g. marketing pages, published owner cards).
 */
export function publicPageMetadata(opts: IndexedPageMetadataOptions): Metadata {
  const url = absoluteUrl(opts.path)
  const ogTitle = opts.openGraphTitle ?? opts.title
  const ogDesc = opts.openGraphDescription ?? opts.description
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.robots ?? { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'en_AU',
      siteName: 'Unite Group',
      title: ogTitle,
      description: ogDesc,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
    },
  }
}

export type NoIndexPageMetadataOptions = {
  title: string
  /** Defaults to `title` when omitted (tab + OG still have something stable). */
  description?: string
  /**
   * Site path for `alternates.canonical` and `openGraph.url` (built with {@link SITE_URL}).
   * Ignored when `canonical` is set.
   */
  path?: string
  /**
   * Full canonical URL override, or `null` to omit `alternates` / `openGraph.url` (e.g. generic not-found).
   */
  canonical?: string | null
  robots?: Metadata['robots']
  openGraphTitle?: string
  openGraphDescription?: string
  /** Extra fields merged last (e.g. `referrer: 'no-referrer'`). */
  extra?: Metadata
}

/**
 * App surfaces that must not appear in search: thank-you flows, auth, portal, founder CRM.
 * Same OG/Twitter shape as marketing pages so previews stay consistent.
 */
export function noIndexPageMetadata(opts: NoIndexPageMetadataOptions): Metadata {
  let url: string | null
  if (opts.canonical !== undefined) {
    url = opts.canonical
  } else if (opts.path !== undefined) {
    const path = opts.path.startsWith('/') ? opts.path : `/${opts.path}`
    url = absoluteUrl(path)
  } else {
    url = null
  }
  const description = opts.description ?? opts.title
  const ogTitle = opts.openGraphTitle ?? opts.title
  const ogDesc = opts.openGraphDescription ?? description
  const robots = opts.robots ?? { index: false, follow: false }
  const base: Metadata = {
    title: opts.title,
    description,
    robots,
    ...opts.extra,
  }
  if (url === null) {
    return {
      ...base,
      openGraph: {
        type: 'website',
        locale: 'en_AU',
        siteName: 'Unite Group',
        title: ogTitle,
        description: ogDesc,
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description: ogDesc,
      },
    }
  }
  return {
    ...base,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'en_AU',
      siteName: 'Unite Group',
      title: ogTitle,
      description: ogDesc,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
    },
  }
}

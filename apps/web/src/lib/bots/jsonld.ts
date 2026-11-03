// JSON-LD for /bots (UNI-3215): one Service per demo bot, and a VideoObject only for a bot whose explainer
// video actually exists. No offers and no prices: none are approved for bots.

import { SITE_URL } from '@/lib/public-site'

import { BOTS, BOTS_PAGE_PATH, type Bot } from './catalogue'

const ORG_REF = { '@id': `${SITE_URL}/#organization` }

function videoJsonLd(bot: Bot) {
  const v = bot.video
  if (!v.src || !v.poster || !v.uploadDate || !v.description) return null
  return {
    '@type': 'VideoObject',
    name: v.title,
    description: v.description,
    thumbnailUrl: `${SITE_URL}${v.poster}`,
    contentUrl: `${SITE_URL}${v.src}`,
    uploadDate: v.uploadDate,
    ...(v.duration ? { duration: v.duration } : {}),
  }
}

export function botServiceJsonLd(bot: Bot) {
  const video = videoJsonLd(bot)
  return {
    '@type': 'Service',
    '@id': `${SITE_URL}${BOTS_PAGE_PATH}#${bot.id}`,
    name: `${bot.name} bot`,
    serviceType: 'AI customer service bot',
    description: bot.summary,
    url: `${SITE_URL}${BOTS_PAGE_PATH}#${bot.id}`,
    provider: ORG_REF,
    areaServed: [
      { '@type': 'Country', name: 'Australia' },
      { '@type': 'Country', name: 'New Zealand' },
    ],
    ...(bot.image.src ? { image: `${SITE_URL}${bot.image.src}` } : {}),
    ...(video ? { subjectOf: video } : {}),
  }
}

export function botsPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': BOTS.map(botServiceJsonLd),
  }
}

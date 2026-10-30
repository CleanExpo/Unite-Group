// One source for the public home, the four pillar pages, the sitemap and llms.txt (spec 2026-10-23, s9).
// Nothing here may name the internal agency: this module feeds public routes only.

import { formatAud } from '@/app/grow/packages'
import { cardFromAud } from '@/lib/public-pricing'

export const SITE_URL = 'https://unite-group.in'
export const CONTACT_EMAIL = 'contact@unite-group.in'

export type Pillar = {
  slug: 'visibility' | 'experience' | 'conversion' | 'intelligence'
  name: string
  /** The line on the home pillars row. */
  line: string
  /** The one job of the pillar page. */
  headline: string
  intro: string
  /** What the pillar will do. Every pillar is "Coming" until it ships. */
  will: readonly string[]
}

export const PILLARS: readonly Pillar[] = [
  {
    slug: 'visibility',
    name: 'Visibility',
    line: 'Be found when people, and AI assistants, look for what you do.',
    headline: 'Be found when people ask.',
    intro: 'Visibility is about showing up accurately in search and in the answers AI assistants give.',
    will: [
      'Check how your business shows up today',
      'Fix the gaps that stop it being found',
      'Keep your business facts consistent everywhere they appear',
    ],
  },
  {
    slug: 'experience',
    name: 'Experience',
    line: 'Give people something worth opening.',
    headline: 'Make the first look worth remembering.',
    intro: 'Experience is what a customer sees and feels in the first few seconds with your business.',
    will: [
      'Short films and pages that feel like your business',
      'Built for a phone first',
      'Fast to load, easy to read',
    ],
  },
  {
    slug: 'conversion',
    name: 'Conversion',
    line: 'Turn interest into an enquiry or an order.',
    headline: 'Turn a look into an enquiry.',
    intro: 'Conversion is the step from interested to in touch: clear next steps and no dead ends.',
    will: [
      'One clear next step on every page',
      'One place for every enquiry',
      'Follow-up that does not rely on anyone remembering',
    ],
  },
  {
    slug: 'intelligence',
    name: 'Intelligence',
    line: 'See what is working, and what to fix next.',
    headline: 'See what is working.',
    intro: 'Intelligence is a plain summary of where enquiries come from and what to do about it.',
    will: [
      'A short summary of where enquiries come from',
      'What to fix next, in order',
      'No dashboard you have to learn',
    ],
  },
]

export const pillarPath = (slug: Pillar['slug']): `/solutions/${Pillar['slug']}` => `/solutions/${slug}`

/** The only product on sale. It sits in the Conversion layer (spec s10). */
export const SHIPPED_PILLAR: Pillar['slug'] = 'conversion'

/** The lowest card price a buyer can pay right now, formatted, or null while online ordering is off (cardFromAud). */
export const lowestCardPrice = (): string | null => {
  const from = cardFromAud()
  return from === null ? null : formatAud(from)
}

export const PRICE_NOTE = 'One-off price, GST included'

/** Every public route, in sitemap order. */
export const PUBLIC_ROUTES = [
  '/',
  '/cards',
  '/cards/order',
  '/cards/terms',
  '/video/ten-clips',
  '/pricing',
  '/signatures',
  ...PILLARS.map((p) => pillarPath(p.slug)),
  '/privacy-policy',
  '/terms-of-service',
] as const

export type PublicRoute = (typeof PUBLIC_ROUTES)[number]

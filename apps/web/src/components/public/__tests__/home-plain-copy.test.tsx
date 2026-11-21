import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))

import { getUser } from '@/lib/supabase/server'

import RootPage from '@/app/page'
import { HOME_START, HOME_TRUST_STRIP } from '../home/copy'

// UNI-3316, UNI-3317 and UNI-3323 (founder visual review, 9 Nov 2026): the trust strip and the
// orientation heading must read at about a fifth-grade level, lead with what the customer gets,
// and make no new claims. Replies are AI-written, so no "human" or "real person" (UNI-3315 item 6).

const strip = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

const BANNED = /\b(leverage|unleash|transformative|holistic|synergy|journey)\b|fast-paced world|not just\b/i
const EMOJI = /\p{Extended_Pictographic}/u
// Jargon the founder flagged, or that a first-time visitor would not know.
const JARGON = /ticket maze|template number|pick the outcome|orientation|\bAUD\b|proof link|called out|offshore|why teams choose/i
// Replies are AI; the founder asked for "human" to go. Keep person-claims out of this copy.
const PERSON = /\b(human|real person|a person|real inbox|our team reads)\b/i
// Unite-Group copy never names Phill's own businesses or their trades.
const OWN_BUSINESS = /restor|carsi|disaster recovery|nrpg|water damage|mould|training/i

/** Rough Flesch-Kincaid grade. A heuristic, so the bar sits at grade 6 for "about fifth grade". */
function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length)
}
function grade(text: string): number {
  const sentences = Math.max(1, (text.match(/[.!?](\s|$)/g) ?? []).length)
  const words = text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w))
  const syl = words.reduce((n, w) => n + syllables(w), 0)
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59
}

const COPY: string[] = [
  HOME_TRUST_STRIP.eyebrow,
  ...HOME_TRUST_STRIP.items.flatMap((i) => [i.title, i.line]),
  HOME_START.eyebrow,
  HOME_START.title,
  HOME_START.lead,
]
// Grade whole blocks as a reader meets them; the formula is meaningless on a two-word title alone.
const BLOCKS: string[] = [
  ...HOME_TRUST_STRIP.items.map((i) => `${i.title}. ${i.line}`),
  `${HOME_START.title} ${HOME_START.lead}`,
]

async function section(id: string) {
  vi.mocked(getUser).mockResolvedValue(null as Awaited<ReturnType<typeof getUser>>)
  const html = renderToStaticMarkup(await RootPage())
  const at = html.indexOf(`id="${id}"`)
  expect(at, `section #${id} exists`).toBeGreaterThan(-1)
  const open = html.lastIndexOf('<section', at)
  return strip(html.slice(open, html.indexOf('</section>', at)))
}

beforeEach(() => vi.clearAllMocks())

describe('home trust strip and orientation copy (UNI-3316, UNI-3317, UNI-3323)', () => {
  it('reads at about a fifth-grade level, card by card', () => {
    for (const text of BLOCKS) expect(grade(text), text).toBeLessThanOrEqual(6)
  })

  it('keeps eyebrows and titles short, in short words', () => {
    const labels = [
      HOME_TRUST_STRIP.eyebrow,
      ...HOME_TRUST_STRIP.items.map((i) => i.title),
      HOME_START.eyebrow,
      HOME_START.title,
    ]
    for (const label of labels) {
      const words = label.split(/\s+/)
      expect(words.length, label).toBeLessThanOrEqual(6)
      for (const w of words) expect(syllables(w), `${label}: ${w}`).toBeLessThanOrEqual(3)
    }
  })

  it('carries no flagged jargon, banned words, emoji, person-claims or own-business names', () => {
    for (const text of COPY) {
      expect(text, text).not.toMatch(JARGON)
      expect(text, text).not.toMatch(BANNED)
      expect(text, text).not.toMatch(EMOJI)
      expect(text, text).not.toMatch(PERSON)
      expect(text, text).not.toMatch(OWN_BUSINESS)
    }
  })

  it('keeps the three trust cards, each led by what the customer gets', () => {
    expect(HOME_TRUST_STRIP.items).toHaveLength(3)
    const [price, approve, email] = HOME_TRUST_STRIP.items
    expect(price.line).toMatch(/Australian dollars/)
    expect(price.line).toMatch(/GST/)
    expect(approve.line).toMatch(/Nothing goes live until you say yes/)
    expect(email.title).toMatch(/email/i)
    expect(email.line).toMatch(/next step/)
  })

  it('renders the new copy in the trust and start sections of the home page', async () => {
    const trust = await section('trust')
    for (const item of HOME_TRUST_STRIP.items) {
      expect(trust).toContain(item.title)
      expect(trust).toContain(item.line)
    }
    expect(trust).not.toMatch(JARGON)
    const start = await section('start')
    expect(start).toContain(HOME_START.title)
    expect(start).toContain(HOME_START.lead)
  })
})

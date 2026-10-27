import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { EDITIONS } from '@/app/cards/editions'
import { BUSINESSES } from '@/components/public/businesses'
import { COMING, TODAY } from '@/components/public/today-coming-data'

// Phill 26/10/2026 (UNI-3034): no CARSI, Disaster Recovery, NRPG, restoration or training content on the public home
// or card pages. The CARSI Pty Ltd payment-entity disclosure is a legal line and is checked elsewhere.
const BANNED = /carsi|disaster|nrpg|restor|training|water damage/i
const PUBLIC = join(__dirname, '..', '..', '..', 'public')

describe('public pages carry no restoration-industry content', () => {
  it('has none in the business list, the Today and Coming lists or the card editions', () => {
    expect(JSON.stringify(BUSINESSES)).not.toMatch(BANNED)
    expect(JSON.stringify([TODAY, COMING])).not.toMatch(BANNED)
    expect(JSON.stringify(EDITIONS)).not.toMatch(BANNED)
  })

  it('has none in the home page metadata', async () => {
    const { metadata } = await import('@/app/page')
    expect(JSON.stringify(metadata)).not.toMatch(BANNED)
  })

  it('serves no restoration-industry logo or card film file', () => {
    expect(readdirSync(join(PUBLIC, 'landing', 'logos')).filter((f) => BANNED.test(f))).toEqual([])
    expect(readdirSync(join(PUBLIC, 'cards', 'media')).filter((f) => BANNED.test(f))).toEqual([])
  })

  it('the guard can fail: it catches a planted name', () => {
    expect(JSON.stringify([{ name: 'Disaster Recovery' }])).toMatch(BANNED)
  })
})

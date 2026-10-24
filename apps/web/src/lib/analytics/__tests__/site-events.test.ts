import { describe, expect, it } from 'vitest'
import { isPublicPath } from '@/proxy'
import { PUBLIC_ROUTES } from '@/lib/public-site'
import {
  TRACKED_PATHS,
  cleanCampaignTag,
  countryFromHeader,
  deviceFromUserAgent,
  isBotUserAgent,
  isTrackedPath,
  referrerHost,
  splitPath,
  visitorOptedOut,
} from '../site-events'

describe('tracked paths', () => {
  it('match the public site routes exactly (a new public page must be added to both)', () => {
    expect([...TRACKED_PATHS].sort()).toEqual([...PUBLIC_ROUTES].sort())
  })

  it('never include a founder, auth or api route', () => {
    for (const p of ['/founder/command-centre', '/auth/login', '/api/leads', '/founder/site-analytics']) {
      expect(isTrackedPath(p)).toBe(false)
    }
  })

  it('/api/events is reachable without sign-in', () => {
    expect(isPublicPath('/api/events')).toBe(true)
    expect(isPublicPath('/api/eventsx')).toBe(false)
  })
})

describe('splitPath', () => {
  it('drops the query string and fragment but keeps utm_*', () => {
    expect(splitPath('/cards?a=1&utm_source=x&utm_medium=y&utm_campaign=z#top')).toEqual({
      path: '/cards',
      utm: { utm_source: 'x', utm_medium: 'y', utm_campaign: 'z' },
    })
  })
  it('rejects non-paths', () => {
    expect(splitPath('https://x.test/')).toBeNull()
    expect(splitPath('//x.test/')).toBeNull()
    expect(splitPath('cards')).toBeNull()
  })
})

describe('referrerHost', () => {
  it('keeps the host only', () => {
    expect(referrerHost('https://www.Example.com:8443/a/b?c=d')).toBe('example.com')
  })
  it('returns null for own hosts, junk and non-http', () => {
    expect(referrerHost('https://unite-group.in/x', ['unite-group.in'])).toBeNull()
    expect(referrerHost('not a url')).toBeNull()
    expect(referrerHost('android-app://com.google.android.gm')).toBeNull()
    expect(referrerHost('')).toBeNull()
  })
})

describe('classifiers', () => {
  it('detects bots', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36')).toBe(false)
  })
  it('classifies devices', () => {
    expect(deviceFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
    expect(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe('mobile')
    expect(deviceFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop')
    expect(deviceFromUserAgent(null)).toBe('unknown')
  })
  it('validates country codes', () => {
    expect(countryFromHeader('au')).toBe('AU')
    expect(countryFromHeader('AUS')).toBeNull()
    expect(countryFromHeader(null)).toBeNull()
  })
  it('reads DNT and GPC', () => {
    expect(visitorOptedOut(new Headers({ dnt: '1' }))).toBe(true)
    expect(visitorOptedOut(new Headers({ 'sec-gpc': '1' }))).toBe(true)
    expect(visitorOptedOut(new Headers({ dnt: '0' }))).toBe(false)
  })
})

describe('cleanCampaignTag', () => {
  it('keeps ordinary campaign tags', () => {
    for (const v of ['nrpg', 'oct-launch', 'Card_2026', 'a b', 'x.y+z']) expect(cleanCampaignTag(v)).toBe(v)
  })
  it('drops personal-looking or markup values', () => {
    for (const v of ['a@b.co', '0412345678', 'call <b>', '', ' ', '-lead', 'x'.repeat(101)]) expect(cleanCampaignTag(v)).toBeNull()
    expect(cleanCampaignTag(null)).toBeNull()
  })
})

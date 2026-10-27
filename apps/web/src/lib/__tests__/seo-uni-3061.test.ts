import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EDITIONS } from '@/app/cards/editions'
import { FAQ_FACTS } from '@/app/cards/showroom-facts'
import { GET } from '@/app/video-sitemap.xml/route'
import { cardsPageGraphJsonLd } from '@/lib/cards-jsonld'
import { cardFilms, cardVideosJsonLd, videoSitemapXml } from '@/lib/cards-video'
import { INDEXNOW_KEY, INDEXNOW_KEY_PATH, indexNowPayload } from '@/lib/indexnow'
import { isPublicPath } from '@/proxy'

const PUBLIC = join(__dirname, '../../../public')
const fileFor = (url: string) => join(PUBLIC, new URL(url).pathname)

describe('card VideoObject JSON-LD (UNI-3061)', () => {
  it('has one VideoObject per film with every required field, on unite-group.in', () => {
    const vids = cardVideosJsonLd()
    expect(vids).toHaveLength(10)
    expect(vids).toHaveLength(EDITIONS.length)
    for (const v of vids) {
      expect(v['@type']).toBe('VideoObject')
      for (const k of ['name', 'description', 'thumbnailUrl', 'contentUrl', 'uploadDate'] as const) expect(v[k]).toBeTruthy()
      expect(v.contentUrl).toMatch(/^https:\/\/unite-group\.in\/cards\/media\/.+\.mp4$/)
      expect(v.thumbnailUrl[0]).toMatch(/^https:\/\/unite-group\.in\/cards\/media\/thumbs\/.+\.jpg$/)
      expect(Number.isNaN(Date.parse(v.uploadDate))).toBe(false)
      expect(v.duration).toMatch(/^PT\d+S$/)
    }
    expect(new Set(vids.map((v) => v['@id'])).size).toBe(10)
  })

  it('points at files that exist in public/', () => {
    for (const f of cardFilms()) {
      expect(existsSync(fileFor(f.contentUrl)), f.contentUrl).toBe(true)
      expect(existsSync(fileFor(f.thumbnailUrl)), f.thumbnailUrl).toBe(true)
    }
  })

  it('new copy and thumbnails never say Nexus or CARSI', () => {
    for (const f of cardFilms()) {
      expect(`${f.name} ${f.description} ${f.thumbnailUrl}`).not.toMatch(/nexus|carsi/i)
    }
  })
})

describe('/cards page graph', () => {
  it('has the 10 films and a FAQPage that matches the visible FAQ word for word', () => {
    const g = cardsPageGraphJsonLd()['@graph'] as Record<string, any>[]
    const faq = g.find((n) => n['@type'] === 'FAQPage')!
    expect(g.filter((n) => n['@type'] === 'VideoObject')).toHaveLength(10)
    expect(faq.mainEntity.map((q: any) => q.name)).toEqual(FAQ_FACTS.map((f) => f.question))
    expect(faq.mainEntity.map((q: any) => q.acceptedAnswer.text)).toEqual(FAQ_FACTS.map((f) => f.answer.join(' ')))
  })
})

describe('video sitemap', () => {
  it('is well-formed with one video entry per film', async () => {
    const xml = videoSitemapXml()
    expect(xml).toContain('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"')
    expect(xml.match(/<video:video>/g)).toHaveLength(10)
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
    const res = GET()
    expect(res.headers.get('content-type')).toMatch(/application\/xml/)
    expect(await res.text()).toBe(xml)
  })

  it('is a public path', () => {
    expect(isPublicPath('/video-sitemap.xml')).toBe(true)
    expect(isPublicPath('/video-sitemap.xml/x')).toBe(false)
  })
})

describe('IndexNow', () => {
  it('serves a key file whose content is the key, and keeps it public', () => {
    expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/)
    expect(readFileSync(join(PUBLIC, INDEXNOW_KEY_PATH), 'utf8').trim()).toBe(INDEXNOW_KEY)
    expect(isPublicPath(INDEXNOW_KEY_PATH)).toBe(true)
  })

  it('only submits unite-group.in URLs', () => {
    const p = indexNowPayload(['https://unite-group.in/cards', 'https://evil.example/x', 'nonsense'])
    expect(p.host).toBe('unite-group.in')
    expect(p.urlList).toEqual(['https://unite-group.in/cards'])
  })
})

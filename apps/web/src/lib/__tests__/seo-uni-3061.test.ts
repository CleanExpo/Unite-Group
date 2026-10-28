import { createHash } from 'node:crypto'
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
// SHA-256 of each thumbnail after a visual check on 28/10/2026 that it shows no wordmark
// (no "Nexus" text). A changed or added image fails here until it is looked at again
// and its new hash is recorded. Pixels cannot be read for text in a unit test.
const REVIEWED_THUMBS: Record<string, string> = {
  'edition-blueprint-thumb.jpg': '2f7f7ba5c97c65fe9357fa5a978aa550e75f2536545a0c4c662c8a937ffb6e0d',
  'edition-constellation-thumb.jpg': 'f62cc05ca2af0d52d59084824ac32d04b553862f69dfb6ef2739df3630779bc2',
  'edition-forge-thumb.jpg': '3fc00e293d56bde52b346db0158ccafaafe0336ef62045c18dc3315ab012d2e0',
  'edition-ink-thumb.jpg': 'cff70afb5764330042746d08e2863eb6f772a3ec6e6b22312bf60aa4752b7234',
  'edition-magnet-thumb.jpg': '4f9b008b972aa17aeca60fff13955434063809252d39c7a506a6c015e6cbd3f6',
  'edition-origami-thumb.jpg': '94611c62b5348586ab8f7fe57ee85bda15b65f7aa9d47bf034b2a8b9bb863d12',
  'edition-portal-thumb.jpg': '1f7bfb26c7ff514f7f38053ac1a427c1b95087034593f0f39b94c2965893af12',
  'edition-rewind-thumb.jpg': '6c27300eb15102db8df68c6cc028dafc8eba1f8d1790f81895cb687af7c79f93',
  'edition-signature-thumb.jpg': '8e59af84588488d7547c54004ed89d3b621a38b6afd04d195caa11af2b5d73d3',
  'edition-skyline-thumb.jpg': '1e55c221d8802e436ddaa650e1242b2c73d0106d4cceccf811227d1e90749a29',
}

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

  it('new copy and thumbnail URLs never say Nexus or CARSI', () => {
    for (const f of cardFilms()) {
      expect(`${f.name} ${f.description} ${f.thumbnailUrl}`).not.toMatch(/nexus|carsi/i)
    }
  })

  it('every thumbnail is the exact image that was visually checked for wordmarks', () => {
    for (const f of cardFilms()) {
      const name = new URL(f.thumbnailUrl).pathname.split('/').pop()!
      const sha = createHash('sha256').update(readFileSync(fileFor(f.thumbnailUrl))).digest('hex')
      expect(sha, name).toBe(REVIEWED_THUMBS[name])
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

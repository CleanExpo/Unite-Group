import { describe, expect, it } from 'vitest'

import { InMemorySitePublisher, PublisherError, type PublishableRequest, type SitePublisher } from '../publisher'

const REQ: PublishableRequest = { id: '11111111-1111-1111-1111-111111111111', tenantSlug: 'alpha', page: 'home', requestText: 'Swap the photo' }

/** The contract any SitePublisher must meet. The real BRII publisher should pass this same suite. */
function contract(make: () => SitePublisher) {
  it('createPreview returns an https preview link for that request', async () => {
    const { previewUrl } = await make().createPreview(REQ)
    expect(previewUrl).toMatch(/^https:\/\//)
    expect(previewUrl).toContain(REQ.id)
  })

  it('publish before any preview is refused', async () => {
    await expect(make().publish(REQ.id)).rejects.toMatchObject({ code: 'no_preview' })
  })

  it('rollback before publish is refused', async () => {
    const p = make()
    await expect(p.rollback(REQ.id)).rejects.toMatchObject({ code: 'unknown_request' })
    await p.createPreview(REQ)
    await expect(p.rollback(REQ.id)).rejects.toMatchObject({ code: 'not_published' })
  })

  it('preview, publish, roll back in order; publishing and rolling back twice are no-ops', async () => {
    const p = make()
    await p.createPreview(REQ)
    const first = await p.publish(REQ.id)
    expect(await p.publish(REQ.id)).toEqual(first)
    const back = await p.rollback(REQ.id)
    expect(await p.rollback(REQ.id)).toEqual(back)
  })

  it('a rolled-back request cannot be published or previewed again', async () => {
    const p = make()
    await p.createPreview(REQ)
    await p.publish(REQ.id)
    await p.rollback(REQ.id)
    await expect(p.publish(REQ.id)).rejects.toBeInstanceOf(PublisherError)
    await expect(p.createPreview(REQ)).rejects.toMatchObject({ code: 'rolled_back' })
  })
}

describe('InMemorySitePublisher meets the SitePublisher contract', () => {
  let t = 0
  contract(() => new InMemorySitePublisher(() => new Date(Date.UTC(2026, 10, 2, 9, 0, t++))))

  it('stub preview links use the reserved .invalid domain, so they can never open a real site', async () => {
    const { previewUrl } = await new InMemorySitePublisher().createPreview(REQ)
    expect(new URL(previewUrl).hostname.endsWith('.invalid')).toBe(true)
  })

  it('the stub never touches the network', async () => {
    const original = globalThis.fetch
    let called = false
    globalThis.fetch = (async () => { called = true; throw new Error('network') }) as typeof fetch
    try {
      const p = new InMemorySitePublisher()
      await p.createPreview(REQ)
      await p.publish(REQ.id)
      await p.rollback(REQ.id)
    } finally {
      globalThis.fetch = original
    }
    expect(called).toBe(false)
  })
})

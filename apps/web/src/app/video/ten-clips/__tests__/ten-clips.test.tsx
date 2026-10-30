import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import sitemap from '@/app/sitemap'
import { isPublicPath } from '@/proxy'
import { PUBLIC_ROUTES } from '@/lib/public-site'

import TenClipsPage, { metadata } from '../page'
import * as offer from '../offer'
import { buildTenClipsBody } from '../ten-clips-form'

const html = renderToStaticMarkup(createElement(TenClipsPage))
const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ')

const BANNED = /\b(leverage|unleash|transformative|holistic|synergy|journey|guaranteed|leading|best)\b/i
const EMOJI = /\p{Extended_Pictographic}/u

describe('/video/ten-clips', () => {
  it('opens on the buyer and shows the concrete list, price, steps, needs and delivery promise', () => {
    expect(text).toContain('Ten short videos for your social and ads, without an agency bill.')
    for (const item of offer.WHAT_YOU_GET) expect(text).toContain(item)
    expect(text).toContain('$1,490')
    expect(text).toContain('A$1,490 one-off, GST included.')
    expect(text).toContain('6 clips a month for A$590, GST included')
    expect(text).toContain('available on request, and we will quote')
    expect(text).toContain('Delivered within 7 days of receiving your photos, logo and brief.')
    expect((html.match(/Step \d/g) ?? []).length).toBe(offer.STEPS.length)
    for (const item of offer.WHAT_WE_NEED) expect(text).toContain(item)
  })

  it('labels the sample and invents no price for the presenter', () => {
    expect(text).toContain('Sample made for a made-up business')
    expect(text).not.toMatch(/presenter[^.]*\$\d/i)
  })

  it('has no banned words, emoji, testimonials, or payment link', () => {
    expect(text).not.toMatch(BANNED)
    expect(text).not.toMatch(EMOJI)
    expect(text).not.toMatch(/testimonial/i)
    expect(html).not.toContain('buy.stripe.com')
  })

  it('has metadata with canonical and OG', () => {
    expect(metadata.alternates?.canonical).toBe('https://unite-group.in/video/ten-clips')
    expect(metadata.openGraph?.url).toBe('https://unite-group.in/video/ten-clips')
    expect(String(metadata.description)).toContain('GST included')
  })

  it('is public, in the route list and in the sitemap', () => {
    expect(isPublicPath('/video/ten-clips')).toBe(true)
    expect(isPublicPath('/video/other')).toBe(false)
    expect((PUBLIC_ROUTES as readonly string[]).includes('/video/ten-clips')).toBe(true)
    expect(sitemap().some((e) => new URL(e.url).pathname === '/video/ten-clips')).toBe(true)
  })

  it('posts the offer id through the lead API body', () => {
    const fd = new FormData()
    fd.set('first_name', 'Sam')
    fd.set('email', 'sam@example.com')
    fd.set('company', 'Sam Plumbing')
    const body = buildTenClipsBody(fd, null)
    expect(body.interests).toBe('ten-clips')
    expect(body.referral_source).toBe('video:ten-clips')
    expect(body.message).toContain('Offer: ten-clips')
    expect(body.business_key).toBe('unite-smb')
    expect(html).toContain('name="offer" value="ten-clips"')
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import sitemap from '@/app/sitemap'
import { isPublicPath } from '@/proxy'
import { PUBLIC_ROUTES } from '@/lib/public-site'

import GetAWebsitePage, { metadata } from '../page'
import GetAWebsiteThanksPage, { metadata as thanksMetadata } from '../thanks/page'
import { BookCall } from '../book-call'
import { buildIntakeBody } from '../intake-form'
import { BOOKING_URL, BUDGET_BANDS, CALL_TIMES, HERO_IMAGE, PHOTO_OPTIONS, STEPS, TIMELINES, type ImageSlot } from '../offer'
import { SlotImage } from '../slot-image'

const html = renderToStaticMarkup(createElement(GetAWebsitePage))
const thanksHtml = renderToStaticMarkup(createElement(GetAWebsiteThanksPage))
const words = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ')

const BANNED = /\b(leverage|unleash|transformative|holistic|synergy|journey|guaranteed|leading|best)\b/i
const EMOJI = /\p{Extended_Pictographic}/u

function formWith(values: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) form.set(key, value)
  return form
}

describe('/get-a-website', () => {
  it('asks every question in the brief, including consent', () => {
    for (const name of ['first_name', 'company', 'email', 'phone', 'current_site', 'services', 'goals', 'photos', 'photos_link', 'socials', 'budget_band', 'timeline', 'call_time', 'contact_consent', 'marketing_consent']) {
      expect(html).toContain(`name="${name}"`)
    }
    for (const option of [...PHOTO_OPTIONS, ...BUDGET_BANDS, ...TIMELINES]) expect(words(html)).toContain(option)
    for (const step of STEPS) expect(words(html)).toContain(step.title)
    expect(html).toContain('data-collection-notice="website-intake"')
  })

  it('requires contact consent and leaves both consent boxes unticked', () => {
    const contact = html.match(/<input[^>]*name="contact_consent"[^>]*>/)?.[0] ?? ''
    const marketing = html.match(/<input[^>]*name="marketing_consent"[^>]*>/)?.[0] ?? ''
    expect(contact).toContain('required')
    expect(contact).not.toContain('checked')
    expect(marketing).not.toContain('required')
    expect(marketing).not.toContain('checked')
  })

  it('has no banned words, emoji or drawn graphics, on either page', () => {
    for (const markup of [html, thanksHtml]) {
      expect(words(markup)).not.toMatch(BANNED)
      expect(words(markup)).not.toMatch(EMOJI)
    }
    const main = (markup: string) => markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'))
    expect(main(html)).not.toContain('<svg')
    expect(main(thanksHtml)).not.toContain('<svg')
  })

  it('has metadata with canonical and OG', () => {
    expect(metadata.alternates?.canonical).toBe('https://unite-group.in/get-a-website')
    expect(metadata.openGraph?.url).toBe('https://unite-group.in/get-a-website')
  })

  it('is public, in the route list and in the sitemap', () => {
    expect(isPublicPath('/get-a-website')).toBe(true)
    expect(isPublicPath('/get-a-website/other')).toBe(false)
    expect((PUBLIC_ROUTES as readonly string[]).includes('/get-a-website')).toBe(true)
    expect(sitemap().some((e) => new URL(e.url).pathname === '/get-a-website')).toBe(true)
  })

  it('posts source website_intake with every answer, and consent only when ticked', () => {
    const body = buildIntakeBody(formWith({
      first_name: ' Sam ',
      email: 'sam@example.com',
      company: 'Sample Cafe',
      current_site: 'samplecafe.com.au',
      services: 'Coffee and lunch',
      goals: 'More bookings',
      photos: PHOTO_OPTIONS[0],
      photos_link: 'https://example.com/photos',
      socials: 'instagram.com/samplecafe',
      budget_band: BUDGET_BANDS[4],
      timeline: TIMELINES[3],
      call_time: CALL_TIMES[0],
      contact_consent: 'on',
    }), null)
    expect(body.source).toBe('website_intake')
    expect(body.first_name).toBe('Sam')
    expect(body.interests).toBe('website-intake')
    expect(body.referral_source).toBe('website-intake')
    expect(body.contact_consent).toBe(true)
    expect(body.marketing_consent).toBe(false)
    expect(body.intake).toEqual({
      current_site: 'samplecafe.com.au',
      services: 'Coffee and lunch',
      goals: 'More bookings',
      photos: PHOTO_OPTIONS[0],
      photos_link: 'https://example.com/photos',
      socials: 'instagram.com/samplecafe',
      budget_band: BUDGET_BANDS[4],
      timeline: TIMELINES[3],
      call_time: CALL_TIMES[0],
    })
    for (const line of ['Offer: website-intake', 'Current website: samplecafe.com.au', 'Services: Coffee and lunch', 'Goals: More bookings', 'Budget: Not sure yet', 'Timeline: Not sure yet', 'Call: Yes, in the morning']) {
      expect(body.message).toContain(line)
    }
  })

  it('reports contact consent as false when the box is not ticked, and keeps the campaign tag short', () => {
    const body = buildIntakeBody(formWith({ first_name: 'Sam' }), 'x'.repeat(100))
    expect(body.contact_consent).toBe(false)
    expect(body.referral_source).toBe(`website-intake:${'x'.repeat(48)}`)
    expect(body.message).toBe('Offer: website-intake')
  })

  it('fits the fullest possible answers inside the 4000 character message cap', () => {
    const long = (n: number) => 'x'.repeat(n)
    const body = buildIntakeBody(formWith({
      current_site: long(256), services: long(1500), goals: long(1500), photos: PHOTO_OPTIONS[1],
      photos_link: long(256), socials: long(256), budget_band: BUDGET_BANDS[2], timeline: TIMELINES[1], call_time: CALL_TIMES[3],
    }), null)
    expect(body.message.length).toBeLessThanOrEqual(4000)
  })
})

describe('image slots', () => {
  const filled: ImageSlot = { name: 'test-slot', src: '/get-a-website/test.webp', width: 10, height: 10, alt: 'A shop counter' }

  it('render nothing while empty, so no placeholder reaches the page', () => {
    expect(HERO_IMAGE.src).toBeNull()
    expect(renderToStaticMarkup(createElement(SlotImage, { slot: HERO_IMAGE }))).toBe('')
    expect(html.slice(html.indexOf('<main'), html.indexOf('</main>'))).not.toContain('<img')
  })

  it('render the named picture with its alt text once filled', () => {
    const markup = renderToStaticMarkup(createElement(SlotImage, { slot: filled }))
    expect(markup).toContain('data-image-slot="test-slot"')
    expect(markup).toContain('src="/get-a-website/test.webp"')
    expect(markup).toContain('alt="A shop counter"')
  })
})

describe('/get-a-website/thanks', () => {
  it('is public but kept out of search and the sitemap', () => {
    expect(isPublicPath('/get-a-website/thanks')).toBe(true)
    expect(thanksMetadata.robots).toEqual({ index: false, follow: false })
    expect(sitemap().some((e) => new URL(e.url).pathname === '/get-a-website/thanks')).toBe(false)
  })

  it('confirms the answers arrived and offers a call', () => {
    expect(words(thanksHtml)).toContain('We have your answers.')
    expect(words(thanksHtml)).toContain('Nothing has been charged.')
    expect(words(thanksHtml)).toContain('we will contact you to confirm a time')
    expect(thanksHtml).toContain('mailto:contact@unite-group.in')
  })

  it('never implies a call is already booked while there is no booking link', () => {
    expect(BOOKING_URL).toBeNull()
    expect(words(thanksHtml)).toContain('Your call has not been booked yet.')
    const claims = /\bbook(ed|ing)?\b/gi
    const stripped = words(thanksHtml.slice(thanksHtml.indexOf('<main'), thanksHtml.indexOf('</main>'))).replace('Your call has not been booked yet.', '')
    expect(stripped).not.toMatch(claims)
    expect(String(thanksMetadata.description)).not.toMatch(claims)
    expect(STEPS.map((step) => step.body).join(' ')).not.toMatch(claims)
    expect(words(html)).not.toContain('book a call')
  })

  it('offers the booking page instead of email once a link is set', () => {
    const markup = renderToStaticMarkup(createElement(BookCall, { bookingUrl: 'https://booking.example.com/call' }))
    expect(markup).toContain('href="https://booking.example.com/call"')
    expect(markup).toContain('Book a call')
    expect(markup).not.toContain('mailto:')
  })
})

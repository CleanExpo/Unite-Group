// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { COLLECTION_PURPOSES, collectionNoticeText } from '@/lib/legal/collection-notice'

import GrowPage from '../page'
import { LeadForm } from '../lead-form'

// /api/leads returns 201 once the crm_leads row is stored, even when the alert email
// fails (route.ts catches the notify error and still responds 201). So /grow may only
// say the details were received and that we will reply; never where the message goes,
// who reads it, or that an audit will arrive.
const DELIVERY_CLAIMS = [/goes to/i, /our team/i, /will review/i, /next steps/i, /email you your/i, /inbox/i]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('/grow makes no delivery claim', () => {
  it('the API it relies on answers 201 even when the alert email fails', () => {
    const route = readFileSync('src/app/api/leads/route.ts', 'utf8')
    expect(route).toContain("console.error('[leads] alert failed:'")
    expect(route).toMatch(/\{ status: 201 \}\)\s*\}\s*$/)
  })

  it('confirms receipt with the agreed wording only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 201 })))
    const { container } = render(createElement(LeadForm))
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } })
    fireEvent.submit(container.querySelector('form')!)
    const status = await screen.findByRole('status')
    expect(status.textContent).toBe('Thank you. We have your details and will reply by email.')
  })

  it('the page and form copy name no destination or reader', () => {
    const text = renderToStaticMarkup(createElement(GrowPage)).replace(/<[^>]+>/g, ' ')
    for (const claim of DELIVERY_CLAIMS) expect(text).not.toMatch(claim)
  })

  it('the collection notice says we store the details to reply, and promises no results email', () => {
    const notice = collectionNoticeText('grow')
    expect(COLLECTION_PURPOSES.grow).toBe('to reply to your enquiry')
    expect(notice).toContain('We store them in our database')
    expect(notice).not.toMatch(/send you the results/i)
  })

  it('the marketing tick box promises no unsubscribe link the senders do not add', () => {
    const html = renderToStaticMarkup(createElement(LeadForm))
    expect(html).not.toMatch(/unsubscribe/i)
  })
})

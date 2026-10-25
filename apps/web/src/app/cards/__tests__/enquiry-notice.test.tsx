import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { COLLECTION_PURPOSES, PRIVACY_CONTACT_EMAIL, PRIVACY_POLICY_PATH } from '@/lib/legal/collection-notice'
import { COMPANY_NAME } from '@/lib/legal/company'

import { CardEnquiryForm } from '../order/enquiry-form'
import { OrderView } from '../order/order-view'

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ''))

const form = renderToStaticMarkup(createElement(CardEnquiryForm, { referrer: null }))
const page = renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null }))
const NOTICE = /<p[^>]*data-collection-notice="card-enquiry"[^>]*>[\s\S]*?<\/p>/

describe('/cards/order enquiry form collection notice (APP 5)', () => {
  it('renders inside the form, before the submit button', () => {
    const open = form.indexOf('<form')
    const notice = form.indexOf('data-collection-notice="card-enquiry"')
    const submit = form.indexOf('type="submit"')
    const close = form.indexOf('</form>')
    expect(open).toBeGreaterThanOrEqual(0)
    expect(notice).toBeGreaterThan(open)
    expect(notice).toBeLessThan(submit)
    expect(submit).toBeLessThan(close)
  })

  it('names the collector, purpose, recipients and contact', () => {
    const t = text(form.match(NOTICE)?.[0] ?? '')
    expect(t).toContain(COMPANY_NAME)
    expect(COMPANY_NAME).toBe('Unite-Group Nexus Pty Ltd')
    expect(t).toContain(COLLECTION_PURPOSES['card-enquiry'])
    expect(t).toContain('Supabase')
    expect(t).toContain('Mailtrap')
    expect(t).toContain(PRIVACY_CONTACT_EMAIL)
  })

  it('links the privacy policy', () => {
    expect(form.match(NOTICE)?.[0]).toContain(`href="${PRIVACY_POLICY_PATH}"`)
    expect(form.match(NOTICE)?.[0]).toContain('href="/privacy-policy"')
  })

  it('asks for nothing: no input, button or select inside the notice', () => {
    const n = form.match(NOTICE)?.[0] ?? ''
    expect(n).not.toBe('')
    expect(n).not.toMatch(/<(input|button|select|textarea)\b/)
  })

  it('leaves exactly one collection notice on the page, none after the form', () => {
    expect(page.match(/data-collection-notice=/g)).toHaveLength(1)
    expect(page.slice(page.indexOf('</form>'))).not.toContain('data-collection-notice')
  })
})

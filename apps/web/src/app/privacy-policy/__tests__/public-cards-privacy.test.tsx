import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '../page'

const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const html = () => renderToStaticMarkup(createElement(PrivacyPolicyPage))

/** The text of the new section only. */
const section = () => {
  const h = html()
  const start = h.indexOf('Public Website and Living Business Cards')
  if (start < 0) return ''
  const end = h.indexOf('</section>', start)
  return decode(h.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
}

describe('privacy policy: public website and Living Business Cards', () => {
  it('has the section, and keeps the existing app sections', () => {
    expect(section()).toContain('Public Website and Living Business Cards')
    const h = decode(html())
    for (const title of ['1. Overview', '2. Information We Collect', '6. Third-Party Service Providers', '10. Website Enquiries and Free Audits'])
      expect(h, title).toContain(title)
  })

  it('says what is collected from buyers, card owners and card visitors, and why', () => {
    const s = section()
    for (const w of ['buy a card', 'name, email address', 'billing address', 'phone number', 'logo', 'where we met', 'visitors', 'enquiry or feedback'])
      expect(s, w).toContain(w)
    expect(s).toContain('to supply, host and support your card')
  })

  it('names the recipients the code actually uses', () => {
    const s = section()
    for (const r of ['Stripe', 'CARSI Pty Ltd', 'Supabase', 'Vercel', 'Mailtrap']) expect(s, r).toContain(r)
  })

  it('says card-owner delivery only once the forms are switched on', () => {
    expect(section()).toContain('Enquiry forms on cards are not switched on yet. When they are, messages will be stored and passed to the card owner.')
  })

  it('discloses the Margot phone line: AI answer, recording and transcription, CRM summary, and its two providers', () => {
    const s = section()
    expect(s).toContain('Calls to the Margot phone line are answered by an AI assistant, not a person.')
    expect(s).toContain('Calls may be recorded and transcribed so we can follow up')
    expect(s).toContain('a summary of the call is stored in our CRM')
    expect(s).toContain('ElevenLabs')
    expect(s).toContain('Twilio')
  })

  it('invents no processor and no region', () => {
    const s = section()
    expect(s.length, 'section must exist for this check to mean anything').toBeGreaterThan(500)
    for (const w of ['Mailgun', 'Postmark', 'Resend', 'AWS SES', 'Sydney', 'ap-southeast']) expect(s, w).not.toContain(w)
  })

  it('says database administrators can technically read enquiries', () => {
    expect(section()).toContain('Our database administrators can technically read enquiries sent through a card.')
  })

  it('states retention, access, correction, deletion and the OAIC', () => {
    const s = section()
    expect(s).toContain('only as long as we need them to supply your card and respond to you, and we delete them when you ask us to')
    expect(s).toContain('records we must keep by law, such as tax records, are kept for as long as the law requires')
    expect(s).toContain('access, correct or delete')
    expect(s).toContain('contact@unite-group.in')
    expect(s).toContain('www.oaic.gov.au')
    expect(s).toContain('1300 363 992')
    expect(html()).toContain('href="https://www.oaic.gov.au"')
  })

  it('makes no claim of legal sign-off and promises no marketing', () => {
    const s = section().toLowerCase()
    for (const w of ['legal advice', 'lawyer', 'solicitor', 'legally reviewed', 'approved by', 'compliant with'])
      expect(s, w).not.toContain(w)
    expect(s).toContain('we do not sell your personal information')
  })

  it('moves the last-updated date past the old one', () => {
    const h = decode(html())
    expect(h).toContain('Last updated: 25 October 2026')
    expect(h).not.toContain('19 October 2026')
  })
})

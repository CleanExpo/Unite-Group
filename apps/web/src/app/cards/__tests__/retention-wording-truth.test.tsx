import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '../../privacy-policy/page'
import CardTermsPage from '../terms/page'

/**
 * UNI-3017. Nothing in the code deletes card_orders, card_order_intakes, crm_leads or enquiry records after a
 * hosting term, and nothing records when hosting ends. The wording must promise only what is done: deletion on
 * request, subject to legal retention, and keeping records only as long as needed (as policy section 10 says).
 */
const text = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

const terms = () => text(createElement(CardTermsPage))
const policy = () => text(createElement(PrivacyPolicyPage))

describe('retention wording promises only what is done', () => {
  it('terms no longer promise deletion 12 months after hosting', () => {
    expect(terms()).not.toContain('for 12 months after, then delete them')
  })

  it('terms say records are kept only as long as needed and deleted on request, except legal records', () => {
    expect(terms()).toContain(
      'We keep order and enquiry records only as long as we need them to supply your card and respond to you, and we delete them when you ask us to, except records we must keep by law (such as tax records).',
    )
  })

  it('privacy policy 13.3 no longer promises deletion 12 months after hosting', () => {
    expect(policy()).not.toContain('for 12 months after, then delete them')
  })

  it('privacy policy 13.3 says the same as the terms and keeps the legal-records carve-out', () => {
    expect(policy()).toContain(
      'We keep order and enquiry records only as long as we need them to supply your card and respond to you, and we delete them when you ask us to, except that records we must keep by law, such as tax records, are kept for as long as the law requires.',
    )
  })

  it('privacy policy section 10 still carries the same "as long as needed ... unless you ask" rule', () => {
    expect(policy()).toContain('as long as needed to respond and follow up, unless you ask us to delete them sooner')
  })
})

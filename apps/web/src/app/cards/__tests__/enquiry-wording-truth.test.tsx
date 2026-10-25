import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '../../privacy-policy/page'
import CardTermsPage from '../terms/page'

/**
 * UNI-3017. Card enquiry forms are not switched on (CARD_ENQUIRY_RECEIPT_ENABLED is set nowhere; the form says
 * "The card owner is not notified yet"). The terms and the privacy policy must not say a message is emailed to
 * the owner today.
 */
const text = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

const terms = () => text(createElement(CardTermsPage))
const policy = () => text(createElement(PrivacyPolicyPage))

const TRUTH = 'Enquiry forms on cards are not switched on yet. When they are, messages'

describe('card enquiries: terms and privacy policy tell the truth about delivery', () => {
  it('terms section 13 says the forms are not on yet and that messages will be stored and passed to the owner', () => {
    const t = terms()
    expect(t).toContain(TRUTH)
    expect(t).toContain('stored in the Unite-Group database and passed to the card owner')
  })

  it('terms no longer say a message is emailed to the card owner', () => {
    expect(terms()).not.toContain('and emailed to you')
  })

  it('privacy policy 13.2 says the forms are not on yet and that messages will be stored and passed to the owner', () => {
    expect(policy()).toContain('Enquiry forms on cards are not switched on yet. When they are, messages will be stored and passed to the card owner.')
  })

  it('privacy policy no longer says a message is sent to the card owner by email', () => {
    expect(policy()).not.toContain('the message is sent to the owner of the card by email')
  })

  it('privacy policy 13.1 does not describe visitor collection as already happening', () => {
    const p = policy()
    expect(p).not.toContain('so it can reach the card owner and be stored for them')
    expect(p).toContain('Card visitors: enquiry forms on cards are not switched on yet.')
  })
})

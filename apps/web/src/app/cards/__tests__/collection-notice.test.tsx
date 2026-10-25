import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CollectionNotice } from '../collection-notice'

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
const render = (to?: string) => renderToStaticMarkup(createElement(CollectionNotice, to ? { to } : {}))
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ''))

describe('CollectionNotice (APP 5)', () => {
  it('says who gets the message, why it is collected and how to ask for access or deletion', () => {
    const t = text(render())
    expect(t).toContain('Your message goes to Unite Group.')
    expect(t).toContain('We collect your details to reply to you and to manage your enquiry or order.')
    expect(t).toContain('access, correct or delete')
  })

  it('names the recipient it is given, so a card visitor is told the card owner gets the message', () => {
    expect(text(render('the owner of this card and Unite Group'))).toContain('Your message goes to the owner of this card and Unite Group.')
  })

  it('links the privacy policy exactly once', () => {
    const html = render()
    expect(html.match(/<a [^>]*href="\/privacy-policy"[^>]*>privacy policy<\/a>/g)).toHaveLength(1)
    expect(html.match(/<a /g)).toHaveLength(1)
  })

  it('adds no checkbox, input or marketing wording', () => {
    const html = render()
    expect(html).not.toMatch(/<(input|button|label)/)
    expect(text(html).toLowerCase()).not.toMatch(/marketing|subscribe|newsletter/)
  })
})

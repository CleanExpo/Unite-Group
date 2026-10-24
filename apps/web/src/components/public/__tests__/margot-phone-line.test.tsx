import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MargotPhoneLine } from '../margot-phone-line'

const html = (number: string | null) => renderToStaticMarkup(createElement(MargotPhoneLine, { number }))

describe('MargotPhoneLine', () => {
  it('renders nothing without a number', () => {
    expect(html(null)).toBe('')
  })

  it('renders the link, the AI disclosure and an E.164 href for a valid number', () => {
    const out = html('+61400000000')
    expect(out).toContain('href="tel:+61400000000"')
    expect(out).toContain('Call Margot (AI assistant)')
    expect(out).toContain('+61400000000')
    expect(out).toContain('Answered by our AI assistant. Messages go to our team by email.')
  })

  it('refuses to render a value that is not E.164 even if a caller passes one', () => {
    expect(html('0400 000 000')).toBe('')
    expect(html('tel:+61400000000')).toBe('')
  })
})

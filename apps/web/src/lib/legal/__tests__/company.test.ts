import { describe, it, expect, afterEach } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { companyAbn, companyAbnLabel } from '../company'
import PrivacyPolicyPage from '@/app/privacy-policy/page'
import TermsOfServicePage from '@/app/terms-of-service/page'

// The ATO's published example ABN — a checksum-valid fixture, not the company's number.
const EXAMPLE_ABN = '51824753556'

describe('companyAbn', () => {
  it('formats a checksum-valid ABN, ignoring whitespace', () => {
    expect(companyAbn({ COMPANY_ABN: '51 824 753 556' })).toBe('51 824 753 556')
    expect(companyAbnLabel({ COMPANY_ABN: EXAMPLE_ABN })).toBe('ABN 51 824 753 556')
  })

  it.each([
    ['unset', undefined],
    ['blank', '   '],
    ['wrong length', '5182475355'],
    ['non-digit', '5182475355x'],
    ['checksum failure', '51824753557'],
  ])('returns ABN pending when %s', (_label, value) => {
    expect(companyAbn({ COMPANY_ABN: value })).toBeNull()
    expect(companyAbnLabel({ COMPANY_ABN: value })).toBe('ABN pending')
  })
})

describe.each([
  ['privacy policy', PrivacyPolicyPage],
  ['terms of service', TermsOfServicePage],
])('%s page', (_name, Page) => {
  const original = process.env.COMPANY_ABN
  afterEach(() => {
    if (original === undefined) delete process.env.COMPANY_ABN
    else process.env.COMPANY_ABN = original
  })

  const render = () => renderToStaticMarkup(createElement(Page))

  it('renders the ABN when COMPANY_ABN is set', () => {
    process.env.COMPANY_ABN = EXAMPLE_ABN
    const html = render()
    expect(html).toContain('ABN 51 824 753 556')
    expect(html).not.toContain('ABN pending')
  })

  it('renders an explicit "ABN pending" when COMPANY_ABN is unset — never a bare ABN', () => {
    delete process.env.COMPANY_ABN
    const html = render()
    expect(html).toContain('ABN pending')
    expect(html).not.toMatch(/Pty Ltd ABN|— ABN ·/)
  })
})

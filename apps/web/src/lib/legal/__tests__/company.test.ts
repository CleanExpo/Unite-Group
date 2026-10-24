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

  const DEFAULT_LABEL = 'ABN 95 691 477 844'

  // Reason for the change: the ABN was verified on the public ABR on 25/10/2026, so an unset, blank or
  // invalid COMPANY_ABN now falls back to it instead of saying "ABN pending".
  it.each([
    ['unset', undefined],
    ['blank', '   '],
    ['wrong length', '5182475355'],
    ['non-digit', '5182475355x'],
    ['checksum failure', '51824753557'],
  ])('falls back to the verified ABN when %s', (_label, value) => {
    expect(companyAbn({ COMPANY_ABN: value })).toBe('95 691 477 844')
    expect(companyAbnLabel({ COMPANY_ABN: value })).toBe(DEFAULT_LABEL)
  })

  it('lets a valid COMPANY_ABN override the default', () => {
    expect(companyAbnLabel({ COMPANY_ABN: EXAMPLE_ABN })).toBe('ABN 51 824 753 556')
  })

  it('never renders ABN pending or a malformed number', () => {
    for (const v of [undefined, '', ' ', '1', 'abc', '51824753557']) {
      expect(companyAbnLabel({ COMPANY_ABN: v })).toMatch(/^ABN \d{2} \d{3} \d{3} \d{3}$/)
    }
  })

  it('the default passes the ATO checksum (checked here independently of company.ts)', () => {
    const digits = (companyAbn({}) ?? '').replace(/ /g, '')
    expect(digits).toBe('95691477844')
    const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    const sum = digits.split('').reduce((t, c, i) => t + (Number(c) - (i === 0 ? 1 : 0)) * w[i], 0)
    expect(sum % 89).toBe(0)
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

  it('renders the verified default ABN when COMPANY_ABN is unset (was "ABN pending" before the ABR check) — never a bare ABN', () => {
    delete process.env.COMPANY_ABN
    const html = render()
    expect(html).toContain('ABN 95 691 477 844')
    expect(html).not.toContain('ABN pending')
    expect(html).not.toMatch(/Pty Ltd ABN|— ABN ·/)
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  COLLECTION_PURPOSES,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_PATH,
} from '@/lib/legal/collection-notice'
import { COMPANY_NAME } from '@/lib/legal/company'

import { LeadForm } from '../lead-form'

const html = renderToStaticMarkup(createElement(LeadForm))
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&')

function notice() {
  const start = html.indexOf('data-collection-notice="grow"')
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</p>', start))
}

describe('/grow lead form APP 5 collection notice', () => {
  it('sits inside the form, before the submit button', () => {
    const at = html.indexOf('data-collection-notice="grow"')
    expect(at).toBeGreaterThan(html.indexOf('<form'))
    expect(at).toBeLessThan(html.search(/<button[^>]*type="submit"/))
    expect(at).toBeLessThan(html.indexOf('</form>'))
  })

  it('names the collector, purpose, recipients and privacy contact', () => {
    const text = decode(notice())
    expect(text).toContain(COMPANY_NAME)
    expect(text).toContain('Unite-Group Nexus Pty Ltd')
    expect(text).toContain(COLLECTION_PURPOSES.grow)
    expect(text).toContain('Supabase')
    expect(text).toContain('Mailtrap')
    expect(text).toContain(PRIVACY_CONTACT_EMAIL)
    expect(text).toContain('contact@unite-group.in')
  })

  it('links to the privacy policy inside the notice', () => {
    expect(notice()).toContain(`href="${PRIVACY_POLICY_PATH}"`)
    expect(notice()).toContain('href="/privacy-policy"')
  })

  it('asks for nothing: no input, button or select inside the notice', () => {
    expect(notice()).not.toMatch(/<(input|button|select|textarea)\b/)
  })
})

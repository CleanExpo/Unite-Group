import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  COLLECTION_PURPOSES,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_PATH,
} from '@/lib/legal/collection-notice'
import { COMPANY_NAME } from '@/lib/legal/company'

import { ContactForm } from '../contact-form'

const html = renderToStaticMarkup(createElement(ContactForm))
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&')

function notice() {
  const start = html.indexOf('data-collection-notice="home"')
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</p>', start))
}

describe('home contact form APP 5 collection notice', () => {
  it('sits inside the form, before the submit button', () => {
    const at = html.indexOf('data-collection-notice="home"')
    expect(at).toBeGreaterThan(html.indexOf('<form'))
    expect(at).toBeLessThan(html.search(/<button[^>]*type="submit"/))
    expect(at).toBeLessThan(html.indexOf('</form>'))
  })

  it('names the collector, purpose, recipients and privacy contact', () => {
    const text = decode(notice())
    expect(text).toContain(COMPANY_NAME)
    expect(text).toContain('Unite-Group Nexus Pty Ltd')
    expect(text).toContain(COLLECTION_PURPOSES.home)
    expect(text).toContain('Supabase')
    expect(text).toContain('SendGrid')
    expect(text).toContain(PRIVACY_CONTACT_EMAIL)
    expect(text).toContain('contact@unite-group.in')
  })

  it('links to the privacy policy inside the notice', () => {
    expect(notice()).toContain(`href="${PRIVACY_POLICY_PATH}"`)
  })
})

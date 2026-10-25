import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { COLLECTION_PURPOSES } from '@/lib/legal/collection-notice'

import { IntakeForm } from '../intake-form'

const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const html = () => renderToStaticMarkup(createElement(IntakeForm, { reference: 'cs_test_a1' }))
const notice = () => /<p[^>]*data-collection-notice="card-intake"[^>]*>[\s\S]*?<\/p>/.exec(html())?.[0] ?? ''

describe('/cards/thanks intake form: APP 5 collection notice', () => {
  it('renders the card-intake notice inside the form, before the submit button', () => {
    const h = html()
    const at = h.indexOf('data-collection-notice="card-intake"')
    expect(at).toBeGreaterThan(h.indexOf('<form'))
    expect(at).toBeLessThan(h.indexOf('</form>'))
    expect(at).toBeGreaterThan(-1)
    expect(at).toBeLessThan(h.indexOf('type="submit"'))
  })

  it('names the company, the purpose, the recipients and the privacy contact', () => {
    const text = decode(notice().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
    for (const w of ['Unite-Group Nexus Pty Ltd', COLLECTION_PURPOSES['card-intake'], 'Supabase', 'SendGrid', 'contact@unite-group.in'])
      expect(text, w).toContain(w)
  })

  it('links to the privacy policy', () => {
    expect(notice()).toContain('href="/privacy-policy"')
  })
})

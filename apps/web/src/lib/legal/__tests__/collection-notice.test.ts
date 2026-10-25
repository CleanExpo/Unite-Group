import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '@/app/privacy-policy/page'
import { CONTACT_EMAIL } from '@/lib/public-site'

import { COMPANY_NAME } from '../company'
import {
  COLLECTION_PURPOSES,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_PATH,
  collectionNoticeText,
  type CollectionNoticeForm,
} from '../collection-notice'

const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const policy = decode(renderToStaticMarkup(createElement(PrivacyPolicyPage)).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')

const forms = Object.keys(COLLECTION_PURPOSES) as CollectionNoticeForm[]

/** The policy wording that backs each form's purpose (sections 10 and 13.1). */
const PURPOSE_BACKING: Array<[CollectionNoticeForm, string[]]> = [
  ['grow', ['run the audit you asked for', 'send you the results', 'reply to your enquiry']],
  ['home', ['reply to your enquiry']],
  ['card-enquiry', ['reply to your enquiry']],
  ['card-intake', ['supply, host and support your card']],
]

describe('collection notice parity with the privacy policy', () => {
  it('names the company the policy names, and starts with it', () => {
    expect(policy).toContain(COMPANY_NAME)
    for (const form of forms) expect(collectionNoticeText(form).startsWith(COMPANY_NAME)).toBe(true)
  })

  it('uses the privacy contact address the policy gives, which is the site contact address', () => {
    expect(policy).toContain(PRIVACY_CONTACT_EMAIL)
    expect(PRIVACY_CONTACT_EMAIL).toBe(CONTACT_EMAIL)
  })

  it('has the policy sentences behind the recipients, the no-sale promise and access', () => {
    expect(policy).toContain('Supabase, which hosts our database.')
    expect(policy).toContain('Vercel, which hosts the website and keeps request logs.')
    expect(policy).toContain('SendGrid, which delivers the emails our system sends.')
    expect(policy).toContain('We do not sell')
    expect(policy).toMatch(/see, correct or delete|access, correct or delete/)
  })

  it('covers every form in the backing table, and the policy backs each purpose', () => {
    expect(PURPOSE_BACKING.map(([form]) => form).sort()).toEqual([...forms].sort())
    for (const [form, phrases] of PURPOSE_BACKING)
      for (const phrase of phrases) expect(policy, `${form}: ${phrase}`).toContain(phrase)
  })

  it('points at a real route', () => {
    expect(PRIVACY_POLICY_PATH).toBe('/privacy-policy')
    expect(existsSync(join(__dirname, '..', '..', '..', 'app', 'privacy-policy', 'page.tsx'))).toBe(true)
  })

  it.each(forms)('the %s notice states its purpose, the recipients and the contact', (form) => {
    const text = collectionNoticeText(form)
    for (const w of [COLLECTION_PURPOSES[form], 'Supabase', 'Vercel', 'SendGrid', PRIVACY_CONTACT_EMAIL, 'We do not sell']) expect(text, w).toContain(w)
  })
})

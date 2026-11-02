import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '@/app/privacy-policy/page'
import { CONTACT_EMAIL } from '@/lib/public-site'

import { COMPANY_NAME } from '../company'
import {
  COLLECTION_ACCESS,
  COLLECTION_PURPOSES,
  COLLECTION_RECIPIENTS,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_PATH,
  collectionNoticeText,
  type CollectionNoticeForm,
} from '../collection-notice'

const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const policy = decode(renderToStaticMarkup(createElement(PrivacyPolicyPage)).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')

/** The purpose cell of the section 6 table row whose provider cell is exactly `provider`. */
const section6Purpose = (provider: string): string => {
  const rows = [...renderToStaticMarkup(createElement(PrivacyPolicyPage)).matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td>/g)]
  const matches = rows.filter((row) => row[1] === provider)
  expect(matches, `section 6 rows for ${provider}`).toHaveLength(1)
  return decode(matches[0][2])
}

const forms = Object.keys(COLLECTION_PURPOSES) as CollectionNoticeForm[]

/** The policy wording that backs each form's purpose (sections 10 and 13.1). */
const PURPOSE_BACKING: Array<[CollectionNoticeForm, string[]]> = [
  ['grow', ['run the audit you asked for', 'send you the results', 'reply to your enquiry']],
  ['home', ['reply to your enquiry']],
  ['website-intake', ['reply to your enquiry']],
  ['card-enquiry', ['reply to your enquiry']],
  ['card-owner-enquiry', ['reply to your enquiry']],
  ['card-intake', ['supply, host and support your card']],
]

const EMAIL_PROVIDER: Record<CollectionNoticeForm, 'SendGrid' | 'Mailtrap' | null> = {
  grow: 'SendGrid',
  home: 'SendGrid',
  'website-intake': null,
  'card-enquiry': 'SendGrid',
  'card-owner-enquiry': 'Mailtrap',
  'card-intake': 'Mailtrap',
}

describe('each form uses the notice for the path it really sends through', () => {
  const src = (path: string) => readFileSync(join(process.cwd(), 'src', path), 'utf8')

  it.each([
    ['app/grow/lead-form.tsx', 'grow', '/api/leads'],
    ['components/public/contact-form.tsx', 'home', '/api/leads'],
    ['app/video/ten-clips/ten-clips-form.tsx', 'home', '/api/leads'],
    ['app/get-a-website/intake-form.tsx', 'website-intake', '/api/leads'],
    ['app/cards/order/enquiry-form.tsx', 'card-enquiry', '/api/leads'],
    ['app/cards/thanks/intake-form.tsx', 'card-intake', '/api/cards/intake'],
  ])('%s shows the %s notice and posts to %s', (file, form, endpoint) => {
    const code = src(file)
    expect(code).toContain(`form="${form}"`)
    expect(code).toContain(`'${endpoint}'`)
  })

  it('the form on a card page shows the Mailtrap notice and its alerts send with Mailtrap', () => {
    expect(src('app/c/[slug]/enquiry-form.tsx')).toContain('form="card-owner-enquiry"')
    expect(src('app/c/[slug]/actions.ts')).toContain("from '@/lib/card/enquiry-alert'")
    expect(src('lib/card/enquiry-alert.ts')).toContain("from '@/lib/integrations/mailtrap'")
  })

  it('the provider each path imports is the one its notice names', () => {
    expect(src('lib/notifications/lead-alert.ts')).toContain("from '@/lib/integrations/sendgrid'")
    expect(src('app/api/cards/intake/route.ts')).toContain("from '@/lib/integrations/mailtrap'")
    expect(src('lib/cards/paid-order.ts')).toContain("from '@/lib/integrations/mailtrap'")
    expect(src('lib/cards/follow-up.ts')).toContain("from '@/lib/integrations/mailtrap'")
  })

  it('the website intake path sends no email', () => {
    expect(src('app/get-a-website/offer.ts')).toContain("INTAKE_SOURCE = 'website_intake'")
    expect(src('app/api/leads/route.ts')).toContain('website intake leads notify in-app only')
  })
})

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
    expect(policy).toContain(
      'SendGrid, which delivers the enquiry alert we receive when you send an enquiry through a website form (your first name, business name and the package requested), and any marketing email you have agreed to receive. The form asking us to build you a website sends no alert email: it notifies us inside the Application.',
    )
    expect(policy).toContain(
      'Mailtrap, which delivers the emails sent when you buy a card: our order alert, your welcome email, any reminder about your order, and the email that passes us the details you give on the thank-you page.',
    )
    expect(policy).not.toContain('SendGrid, which delivers the emails our system sends')
    expect(policy).toContain('owner, where the card has an email address for them, and, unless that email already comes to us, a short alert')
    expect(policy).toContain('We do not sell')
    expect(policy).toMatch(/see, correct or delete|access, correct or delete/)
  })

  it('section 6 gives each provider its own purposes, in that provider\'s table row', () => {
    const sendgrid = section6Purpose('Twilio SendGrid')
    expect(sendgrid).toContain('Enquiry alert emails (first name, business name and package requested)')
    expect(sendgrid).toContain('any marketing email you have agreed to receive (your name and email address)')
    expect(sendgrid).not.toContain('card')

    const mailtrap = section6Purpose('Mailtrap')
    expect(mailtrap).toContain('Living card order emails')
    expect(mailtrap).toContain('where the card has an email address for its owner, the email passing a card enquiry to the card owner')
    expect(mailtrap).toContain('and, unless that email already comes to us, our short alert')
    expect(mailtrap).not.toContain('marketing')
  })

  it('covers every form in the backing table, and the policy backs each purpose', () => {
    expect(PURPOSE_BACKING.map(([form]) => form).sort()).toEqual([...forms].sort())
    for (const [form, phrases] of PURPOSE_BACKING)
      for (const phrase of phrases) expect(policy, `${form}: ${phrase}`).toContain(phrase)
  })

  it('states no purpose the policy does not state: the notice purpose is made only of the backed phrases', () => {
    for (const [form, phrases] of PURPOSE_BACKING) {
      // The notice calls the audit "free"; the policy sentence does not carry that word.
      let rest = COLLECTION_PURPOSES[form].replace('the free audit', 'the audit')
      for (const phrase of phrases) {
        expect(rest, `${form}: ${phrase}`).toContain(phrase)
        rest = rest.replace(phrase, '')
      }
      expect(rest.replace(/\b(to|and)\b|[\s,]/g, ''), `${form}: unbacked purpose text`).toBe('')
    }
  })

  it('pins the recipient and access sentences to the wording the policy sentences above back', () => {
    const enquiry =
      'We store your details in a database hosted by Supabase. Vercel hosts this website and keeps request logs. SendGrid delivers the enquiry alert we receive, which carries your first name, business name and the package you asked about, and any marketing email you agree to receive. We do not sell your information.'
    expect(COLLECTION_RECIPIENTS).toEqual({
      grow: enquiry,
      home: enquiry,
      'website-intake':
        'We store your details in a database hosted by Supabase. Vercel hosts this website and keeps request logs. We do not sell your information.',
      'card-enquiry': enquiry,
      'card-owner-enquiry':
        'We store your details in a database hosted by Supabase. Vercel hosts this website and keeps request logs. Mailtrap delivers the email that passes your enquiry to the card owner, when the card has an email address for them, and a short alert to us with the card and the first name you give, unless that email already comes to us. We do not sell your information.',
      'card-intake':
        'We store your details in a database hosted by Supabase. Vercel hosts this website and keeps request logs. Mailtrap delivers the emails about your card order, including the email that passes us the details you give here. We do not sell your information.',
    })
    expect(COLLECTION_ACCESS).toBe(
      'You may request access to, correction of, or deletion of your information at any time by emailing contact@unite-group.in.',
    )
  })

  it('points at a real route', () => {
    expect(PRIVACY_POLICY_PATH).toBe('/privacy-policy')
    expect(existsSync(join(__dirname, '..', '..', '..', 'app', 'privacy-policy', 'page.tsx'))).toBe(true)
  })

  it.each(forms)('the %s notice states its purpose, the recipients and the contact', (form) => {
    const text = collectionNoticeText(form)
    const provider = EMAIL_PROVIDER[form]
    for (const w of [COLLECTION_PURPOSES[form], 'Supabase', 'Vercel', PRIVACY_CONTACT_EMAIL, 'We do not sell']) expect(text, w).toContain(w)
    // Each form's email goes through one provider, or none; the notice must name only that one.
    for (const name of ['SendGrid', 'Mailtrap'] as const) {
      if (name === provider) expect(text, `${form} must name ${name}`).toContain(name)
      else expect(text, `${form} must not name ${name}`).not.toContain(name)
    }
    expect(text).not.toContain('Email we send you')
  })
})

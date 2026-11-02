// src/lib/legal/collection-notice.ts
// The one source for the Australian Privacy Principle 5 collection notice shown on every public form.
//
// Every fact here is taken from the privacy policy page (src/app/privacy-policy/page.tsx):
// the collector is the company in section 1, the purposes are sections 10 and 13.1, the recipients
// are section 13.2 (Supabase hosts the database, Vercel hosts the website and keeps request logs, SendGrid
// delivers the enquiry alert we receive, Mailtrap delivers the emails about a card order),
// "we do not sell" is sections 10 and 13.1, and access, correction and complaints are sections 10 and 13.4.
// Section 13 "covers the public parts of our website" and "applies in addition to the sections above", so its
// recipients (13.2) apply to /grow and the home form too: an edit to section 13 changes every notice.
// Do not add a fact here that the policy does not state; change the policy first.

import { COMPANY_NAME } from './company'

/** The privacy policy route. The page lives at /privacy-policy; there is no /privacy route. */
export const PRIVACY_POLICY_PATH = '/privacy-policy'

/**
 * The privacy contact address named in sections 10, 12 and 13.4 of the policy. A literal, not an import of
 * CONTACT_EMAIL from @/lib/public-site: that module imports the card order view, which renders this notice, so
 * the import would be circular. A test pins the two equal.
 */
export const PRIVACY_CONTACT_EMAIL = 'contact@unite-group.in'

/** Each public form that collects personal information. */
export type CollectionNoticeForm = 'grow' | 'home' | 'website-intake' | 'card-enquiry' | 'card-owner-enquiry' | 'card-intake'

/** Why each form collects the details, in the policy's own terms. */
export const COLLECTION_PURPOSES: Record<CollectionNoticeForm, string> = {
  // Section 10: "run the audit you asked for, send you the results, and reply to your enquiry".
  grow: 'to run the free audit you asked for, send you the results and reply to your enquiry',
  // Section 10: "reply to your enquiry".
  home: 'to reply to your enquiry',
  // Section 10: "reply to your enquiry". The /get-a-website request form.
  'website-intake': 'to reply to your enquiry',
  // Section 10: "reply to your enquiry". The form is a pre-purchase enquiry ("Nothing has been charged"),
  // so the 13.1 buyer purpose "contact you about your order" is not claimed here.
  'card-enquiry': 'to reply to your enquiry',
  // Section 10: "reply to your enquiry". The enquiry form on a card's own page (/c/[slug]); the recipients
  // sentence says the card owner gets it.
  'card-owner-enquiry': 'to reply to your enquiry',
  // Section 13.1 (card owners): "supply, host and support your card".
  'card-intake': 'to supply, host and support your card',
}

const RECIPIENTS_HOSTING =
  'We store your details in a database hosted by Supabase. Vercel hosts this website and keeps request logs.'
const RECIPIENTS_NO_SALE = 'We do not sell your information.'
// Enquiry forms post to /api/leads, whose alert to us goes through SendGrid (src/lib/notifications/lead-alert.ts).
const RECIPIENTS_ENQUIRY_EMAIL =
  'SendGrid delivers the enquiry alert we receive, which carries your first name, business name and the package you asked about, and any marketing email you agree to receive.'
// The form on a card's own page goes through src/lib/card/enquiry-alert.ts, which sends with Mailtrap.
const RECIPIENTS_CARD_OWNER_EMAIL =
  'Mailtrap delivers the email that passes your enquiry to the card owner, when the card has an email address for them, and a short alert to us with the card and the first name you give.'
// The thank-you page posts to /api/cards/intake, and card order emails go through Mailtrap
// (src/app/api/cards/intake/route.ts, src/lib/cards/paid-order.ts, src/lib/cards/follow-up.ts).
const RECIPIENTS_CARD_EMAIL =
  'Mailtrap delivers the emails about your card order, including the email that passes us the details you give here.'

/** Who the details may go to (section 13.2) and the no-sale promise (sections 10 and 13.1), per form: each form's email goes through one provider, or none. */
export const COLLECTION_RECIPIENTS: Record<CollectionNoticeForm, string> = {
  grow: `${RECIPIENTS_HOSTING} ${RECIPIENTS_ENQUIRY_EMAIL} ${RECIPIENTS_NO_SALE}`,
  home: `${RECIPIENTS_HOSTING} ${RECIPIENTS_ENQUIRY_EMAIL} ${RECIPIENTS_NO_SALE}`,
  // A website intake lead notifies us in the app only, so no email provider receives it (/api/leads, UNI-3172).
  'website-intake': `${RECIPIENTS_HOSTING} ${RECIPIENTS_NO_SALE}`,
  'card-enquiry': `${RECIPIENTS_HOSTING} ${RECIPIENTS_ENQUIRY_EMAIL} ${RECIPIENTS_NO_SALE}`,
  'card-owner-enquiry': `${RECIPIENTS_HOSTING} ${RECIPIENTS_CARD_OWNER_EMAIL} ${RECIPIENTS_NO_SALE}`,
  'card-intake': `${RECIPIENTS_HOSTING} ${RECIPIENTS_CARD_EMAIL} ${RECIPIENTS_NO_SALE}`,
}

/** How to access or correct the details (sections 10 and 13.4). */
export const COLLECTION_ACCESS = `You may request access to, correction of, or deletion of your information at any time by emailing ${PRIVACY_CONTACT_EMAIL}.`

/** The sentence that carries the privacy policy link; the component renders LINK_TEXT as the link. */
export const COLLECTION_POLICY_LEAD = 'Read our'
export const COLLECTION_POLICY_LINK_TEXT = 'privacy policy'
export const COLLECTION_POLICY_TAIL = ' for full details, including how to make a complaint.'

/** The full notice text before the privacy policy link, for one form. */
export function collectionNoticeText(form: CollectionNoticeForm): string {
  return `${COMPANY_NAME} collects the information you provide ${COLLECTION_PURPOSES[form]}. ${COLLECTION_RECIPIENTS[form]} ${COLLECTION_ACCESS}`
}

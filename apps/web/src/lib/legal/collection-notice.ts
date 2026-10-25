// src/lib/legal/collection-notice.ts
// The one source for the Australian Privacy Principle 5 collection notice shown on every public form.
//
// Every fact here is taken from the privacy policy page (src/app/privacy-policy/page.tsx):
// the collector is the company in section 1, the purposes are sections 10 and 13.1, the recipients
// are section 13.2 (Supabase hosts the database, Vercel hosts the website and keeps request logs, SendGrid
// delivers the emails our system sends),
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
export type CollectionNoticeForm = 'grow' | 'home' | 'card-enquiry' | 'card-intake'

/** Why each form collects the details, in the policy's own terms. */
export const COLLECTION_PURPOSES: Record<CollectionNoticeForm, string> = {
  // Section 10: "run the audit you asked for, send you the results, and reply to your enquiry".
  grow: 'to run the free audit you asked for, send you the results and reply to your enquiry',
  // Section 10: "reply to your enquiry".
  home: 'to reply to your enquiry',
  // Section 10: "reply to your enquiry". The form is a pre-purchase enquiry ("Nothing has been charged"),
  // so the 13.1 buyer purpose "contact you about your order" is not claimed here.
  'card-enquiry': 'to reply to your enquiry',
  // Section 13.1 (card owners): "supply, host and support your card".
  'card-intake': 'to supply, host and support your card',
}

/** Who the details may go to (section 13.2) and the no-sale promise (sections 10 and 13.1). */
export const COLLECTION_RECIPIENTS =
  'We store them in our database, hosted by Supabase. Vercel hosts the website and keeps request logs, and the emails we send you are delivered by SendGrid. We do not sell your information.'

/** How to access or correct the details (sections 10 and 13.4). */
export const COLLECTION_ACCESS = `You can ask to see, correct or delete your information at any time by emailing ${PRIVACY_CONTACT_EMAIL}.`

/** The sentence that carries the privacy policy link; the component renders LINK_TEXT as the link. */
export const COLLECTION_POLICY_LEAD = 'Read our'
export const COLLECTION_POLICY_LINK_TEXT = 'privacy policy'
export const COLLECTION_POLICY_TAIL = ', which also explains how to make a complaint.'

/** The full notice text before the privacy policy link, for one form. */
export function collectionNoticeText(form: CollectionNoticeForm): string {
  return `${COMPANY_NAME} collects these details ${COLLECTION_PURPOSES[form]}. ${COLLECTION_RECIPIENTS} ${COLLECTION_ACCESS}`
}

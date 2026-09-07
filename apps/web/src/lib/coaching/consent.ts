/**
 * The consent gate.
 *
 * Recording a private conversation is not a formality in New South Wales. The
 * Surveillance Devices Act 2007 (NSW) s 7 prohibits using a listening device to
 * record a private conversation EVEN ONE YOU ARE A PARTY TO, unless every
 * principal party consents (s 7(3)(a)) or it is reasonably necessary for the
 * protection of the lawful interests of a party (s 7(3)(b)(i)). Maximum penalty
 * for an individual is 100 penalty units and/or 5 years.
 *
 * NOT LEGAL ADVICE, and the primary text was behind Cloudflare when this was
 * written — the section wording needs confirming against legislation.nsw.gov.au
 * and proper advice taken. What is NOT in doubt is the product consequence:
 * consent is a precondition for ingestion, not a checkbox in settings.
 *
 * Separately, the 2025 ICF Code requires disclosing AI use to coaching clients.
 *
 * This is a pure function on purpose. A guard buried inside a route handler can
 * only be tested by standing up a database; this one can be proven to refuse.
 */

export interface ConsentState {
  consent_given: boolean
  consent_date: string | null
  consent_method: string | null
}

export type ConsentVerdict =
  | { allowed: true }
  | { allowed: false; reason: string }

/** Methods the schema's check constraint permits. */
const VALID_METHODS = ['written', 'email', 'verbal_recorded', 'in_person_signed']

/**
 * Decides whether a session may be ingested for this engagement.
 *
 * Fails closed: anything other than a complete, well-formed consent record is a
 * refusal. A half-recorded consent ("given" with no date or method) is treated
 * as no consent, because it cannot be evidenced later.
 */
export function checkConsent(engagement: ConsentState | null | undefined): ConsentVerdict {
  if (!engagement) {
    return { allowed: false, reason: 'engagement_not_found' }
  }
  if (engagement.consent_given !== true) {
    return { allowed: false, reason: 'consent_not_given' }
  }
  if (!engagement.consent_date) {
    return { allowed: false, reason: 'consent_incomplete_no_date' }
  }
  if (!engagement.consent_method) {
    return { allowed: false, reason: 'consent_incomplete_no_method' }
  }
  if (!VALID_METHODS.includes(engagement.consent_method)) {
    return { allowed: false, reason: `consent_method_invalid:${engagement.consent_method}` }
  }
  return { allowed: true }
}

import { createHash } from 'node:crypto'

import { EMAIL_RE } from './enquiry'
import { isValidSlug } from './slug'

// Owner-sent review requests. We send nothing: the owner presses send from their own phone or email, so the owner is
// the sender (Spam Act 2003). We keep a one-way hash of the contact for dedupe and opt-out, never the raw contact.

export type OwnerChannel = 'owner_sms' | 'owner_email' | 'owner_share'
export const OWNER_CHANNELS: readonly OwnerChannel[] = ['owner_sms', 'owner_email', 'owner_share']

export interface ReviewRequestInput {
  slug: string
  firstName: string
  contact: string
  channel: OwnerChannel
  /** The owner ticked "This customer agreed I can message them about this job". Required. */
  consent: boolean
}

export type Contact = { kind: 'email' | 'mobile'; value: string }

/** Lower-cased email, or an Australian mobile in +614XXXXXXXX form. Anything else is null. */
export function normaliseContact(raw: unknown): Contact | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase()
    return email.length <= 254 && EMAIL_RE.test(email) ? { kind: 'email', value: email } : null
  }
  const digits = trimmed.replace(/[\s()-]/g, '')
  if (/^04\d{8}$/.test(digits)) return { kind: 'mobile', value: `+61${digits.slice(1)}` }
  if (/^\+614\d{8}$/.test(digits)) return { kind: 'mobile', value: digits }
  if (/^614\d{8}$/.test(digits)) return { kind: 'mobile', value: `+${digits}` }
  return null
}

/**
 * sha256 over the card and the normalised contact. Scoped to the card, so the same customer of two businesses gives
 * two unrelated hashes. It stops casual reading, not a determined guess of a phone number (see the PR's open questions).
 */
export function recipientHash(slug: string, contact: Contact): string {
  return createHash('sha256').update(`card-review-v1\x1f${slug}\x1f${contact.kind}\x1f${contact.value}`, 'utf8').digest('hex')
}

export type ValidationResult =
  | { ok: true; firstName: string; contact: Contact; hash: string }
  | { ok: false; error: string }

export function validateReviewRequest(input: ReviewRequestInput): ValidationResult {
  if (input.consent !== true) return { ok: false, error: 'tick the box to confirm this customer agreed you can message them' }
  if (!isValidSlug(input.slug)) return { ok: false, error: 'invalid card' }
  if (!OWNER_CHANNELS.includes(input.channel)) return { ok: false, error: 'choose text, email or share' }
  const firstName = typeof input.firstName === 'string' ? input.firstName.trim() : ''
  if (!firstName || firstName.length > 60) return { ok: false, error: 'enter the customer first name (60 characters or fewer)' }
  const contact = normaliseContact(input.contact)
  if (!contact) return { ok: false, error: 'enter an Australian mobile (04..) or an email address' }
  if (input.channel === 'owner_sms' && contact.kind !== 'mobile') return { ok: false, error: 'a text needs a mobile number' }
  if (input.channel === 'owner_email' && contact.kind !== 'email') return { ok: false, error: 'an email needs an email address' }
  return { ok: true, firstName, contact, hash: recipientHash(input.slug, contact) }
}

type DbError = { message: string } | null
export interface ReviewRequestClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: DbError }>
}

export type CreateRequestResult =
  | { ok: true; requestId: string; duplicate: boolean }
  | { ok: false; status: 400 | 403 | 409 | 429 | 500; error: string }

/**
 * Records one request through card_create_review_request (security definer, owner only). The database decides
 * ownership, consent, opt-out and the one-per-recipient-per-day rule; this maps its answer. Every path that did not
 * get a row id back is an error, never a success.
 */
export async function createReviewRequest(client: ReviewRequestClient, input: ReviewRequestInput): Promise<CreateRequestResult> {
  const v = validateReviewRequest(input)
  if (!v.ok) return { ok: false, status: 400, error: v.error }
  const { data, error } = await client.rpc('card_create_review_request', {
    p_card_slug: input.slug,
    p_first_name: v.firstName,
    p_channel: input.channel,
    p_recipient_hash: v.hash,
    p_consent: true,
  })
  if (error) {
    const m = error.message
    if (m.includes('card_review_not_owner')) return { ok: false, status: 403, error: 'you can only ask from your own card' }
    if (m.includes('card_review_consent_required')) return { ok: false, status: 400, error: 'consent is required' }
    if (m.includes('card_review_rate_limited')) return { ok: false, status: 429, error: 'that is a lot of requests today, try again tomorrow' }
    return { ok: false, status: 500, error: 'could not record the request' }
  }
  const row = (Array.isArray(data) ? data[0] : data) as { id?: string | null; outcome?: string } | null
  if (row?.outcome === 'opted_out') return { ok: false, status: 409, error: 'this customer asked not to be contacted again' }
  if (!row?.id || (row.outcome !== 'created' && row.outcome !== 'duplicate')) return { ok: false, status: 500, error: 'could not record the request' }
  return { ok: true, requestId: row.id, duplicate: row.outcome === 'duplicate' }
}

export type OptOutResult = { ok: true } | { ok: false; status: 400 | 403 | 500; error: string }

/** Owner records that a customer replied STOP. Every later request to that contact on this card is refused. */
export async function recordReviewOptOut(client: ReviewRequestClient, slug: string, rawContact: string): Promise<OptOutResult> {
  if (!isValidSlug(slug)) return { ok: false, status: 400, error: 'invalid card' }
  const contact = normaliseContact(rawContact)
  if (!contact) return { ok: false, status: 400, error: 'enter the mobile or email they replied from' }
  const { data, error } = await client.rpc('card_record_review_optout', { p_card_slug: slug, p_recipient_hash: recipientHash(slug, contact) })
  if (error) return error.message.includes('card_review_not_owner')
    ? { ok: false, status: 403, error: 'you can only manage your own card' }
    : { ok: false, status: 500, error: 'could not record the opt-out' }
  return data === true ? { ok: true } : { ok: false, status: 500, error: 'could not record the opt-out' }
}

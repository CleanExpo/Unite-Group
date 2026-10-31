'use server'

import { headers } from 'next/headers'

import { clientIpFrom, guardEnquiry, type GuardInput } from '@/lib/card/enquiry-guard'
import { sendCardEnquiryAlerts } from '@/lib/card/enquiry-alert'
import { submitCardEnquiry, type EnquiryClient, type EnquiryInput, type EnquiryResult } from '@/lib/card/enquiry'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Non-production enquiry receipt. Off unless CARD_ENQUIRY_RECEIPT_ENABLED=1, which no deployment sets: with the
 * flag absent this never builds a database client, and the card page renders no enquiry form.
 */
export async function submitEnquiryAction(slug: string, input: EnquiryInput & GuardInput): Promise<EnquiryResult> {
  if (process.env.CARD_ENQUIRY_RECEIPT_ENABLED !== '1') {
    return { ok: false, status: 503, error: 'enquiries are not open for this card yet' }
  }
  // Consent, honeypot, fill time and per-caller rate limit are all decided before a database client exists.
  const refused = guardEnquiry(input, clientIpFrom(await headers()))
  if (refused) return refused
  let client: EnquiryClient
  try {
    client = createServiceClient() as unknown as EnquiryClient
  } catch {
    return { ok: false, status: 500, error: 'could not store the enquiry' }
  }
  return submitCardEnquiry(client, slug, input, sendCardEnquiryAlerts)
}

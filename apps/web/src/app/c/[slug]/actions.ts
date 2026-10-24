'use server'

import { submitCardEnquiry, type EnquiryClient, type EnquiryInput, type EnquiryResult } from '@/lib/card/enquiry'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Non-production enquiry receipt. Off unless CARD_ENQUIRY_RECEIPT_ENABLED=1, which no deployment sets: with the
 * flag absent this never builds a database client. No page renders a form that calls it yet.
 */
export async function submitEnquiryAction(slug: string, input: EnquiryInput): Promise<EnquiryResult> {
  if (process.env.CARD_ENQUIRY_RECEIPT_ENABLED !== '1') {
    return { ok: false, status: 503, error: 'enquiries are not open for this card yet' }
  }
  let client: EnquiryClient
  try {
    client = createServiceClient() as unknown as EnquiryClient
  } catch {
    return { ok: false, status: 500, error: 'could not store the enquiry' }
  }
  return submitCardEnquiry(client, slug, input)
}
